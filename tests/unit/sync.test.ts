import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { replay, installSyncListeners } from "@/lib/offline/sync";
import * as queueModule from "@/lib/offline/queue";
import type { PendingMutation } from "@/lib/offline/db";

// Use vi.hoisted so mockDb is accessible inside vi.mock factory (hoisted)
const { mockDb, mockInsert, mockUpdate, mockEq, mockFrom } = vi.hoisted(() => {
  const mi = vi.fn();
  const mu = vi.fn();
  const me = vi.fn();
  const mf = vi.fn().mockReturnValue({ insert: mi, update: mu, eq: me });
  const db = {
    pending_mutations: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      orderBy: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
    },
  };
  return { mockDb: db, mockInsert: mi, mockUpdate: mu, mockEq: me, mockFrom: mf };
});

vi.mock("@/lib/offline/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

function makeMutation(kind: PendingMutation["kind"], payload: object, id = "mut-1") {
  return { id, kind, payload: payload as any, createdAt: Date.now(), attempts: 0 };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.pending_mutations.get.mockResolvedValue(null);
  mockFrom.mockReturnValue({ insert: mockInsert, update: mockUpdate, eq: mockEq });
  mockInsert.mockReturnThis();
  mockUpdate.mockReturnThis();
  mockEq.mockReturnThis();
});

describe("replay", () => {
  it("does nothing when queue is empty", async () => {
    const peekSpy = vi.spyOn(queueModule, "peek").mockResolvedValue([]);
    const removeSpy = vi.spyOn(queueModule, "remove");

    await replay();

    expect(peekSpy).toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();

    peekSpy.mockRestore();
  });

  it("removes mutation on successful execution", async () => {
    const mutation = makeMutation("workout_log.create", {
      id: "wl-1",
      client_id: "client-1",
      scheduled_workout_id: "sw-1",
    });
    vi.spyOn(queueModule, "peek").mockResolvedValue([mutation]);
    const removeSpy = vi.spyOn(queueModule, "remove");
    mockInsert.mockResolvedValue({ error: null });

    await replay();

    expect(removeSpy).toHaveBeenCalledWith("mut-1");
  });

  it("stops and bumps error on non-duplicate failure", async () => {
    const mutation = makeMutation("workout_log.create", { id: "wl-1", client_id: "client-1" });
    vi.spyOn(queueModule, "peek").mockResolvedValue([mutation]);
    const bumpSpy = vi.spyOn(queueModule, "bumpError");
    vi.spyOn(queueModule, "remove");
    mockInsert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });

    await replay();

    expect(bumpSpy).toHaveBeenCalled();
  });

  it("skips duplicate error (code 23505) without stopping", async () => {
    const mutation = makeMutation("set_log.create", {
      id: "set-1",
      workout_log_id: "wl-1",
      exercise_id: "ex-1",
    });
    vi.spyOn(queueModule, "peek").mockResolvedValue([mutation]);
    const removeSpy = vi.spyOn(queueModule, "remove");
    const bumpSpy = vi.spyOn(queueModule, "bumpError");
    mockInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    await replay();

    expect(removeSpy).toHaveBeenCalledWith("mut-1");
    expect(bumpSpy).not.toHaveBeenCalled();
  });

  it("skips duplicate error by message match without stopping", async () => {
    const mutation = makeMutation("message.send", {
      id: "msg-1",
      thread_id: "thread-1",
      sender_id: "sender-1",
      content: "Hello",
    });
    vi.spyOn(queueModule, "peek").mockResolvedValue([mutation]);
    const removeSpy = vi.spyOn(queueModule, "remove");
    const bumpSpy = vi.spyOn(queueModule, "bumpError");
    mockInsert.mockResolvedValue({ error: { code: undefined, message: "duplicate key" } });

    await replay();

    expect(removeSpy).toHaveBeenCalledWith("mut-1");
    expect(bumpSpy).not.toHaveBeenCalled();
  });

  it("processes workout.complete mutation", async () => {
    const mutation = makeMutation("workout.complete", { scheduled_workout_id: "sw-1" });
    vi.spyOn(queueModule, "peek").mockResolvedValue([mutation]);
    const removeSpy = vi.spyOn(queueModule, "remove");
    mockEq.mockResolvedValue({ error: null });

    await replay();

    expect(mockFrom).toHaveBeenCalledWith("scheduled_workouts");
    expect(removeSpy).toHaveBeenCalledWith("mut-1");
  });

  it("processes set_log.create mutation", async () => {
    const mutation = makeMutation("set_log.create", {
      id: "set-1",
      workout_log_id: "wl-1",
      exercise_id: "ex-1",
      program_exercise_id: null,
      set_number: 1,
      weight: 100,
      reps: 5,
      rpe: 8,
    });
    vi.spyOn(queueModule, "peek").mockResolvedValue([mutation]);
    const removeSpy = vi.spyOn(queueModule, "remove");
    mockInsert.mockResolvedValue({ error: null });

    await replay();

    expect(mockFrom).toHaveBeenCalledWith("set_logs");
    expect(removeSpy).toHaveBeenCalledWith("mut-1");
  });

  it("processes message.send mutation", async () => {
    const mutation = makeMutation("message.send", {
      id: "msg-1",
      thread_id: "thread-1",
      sender_id: "sender-1",
      content: "Hello world",
    });
    vi.spyOn(queueModule, "peek").mockResolvedValue([mutation]);
    const removeSpy = vi.spyOn(queueModule, "remove");
    mockInsert.mockResolvedValue({ error: null });

    await replay();

    expect(mockFrom).toHaveBeenCalledWith("messages");
    expect(removeSpy).toHaveBeenCalledWith("mut-1");
  });

  it("stops on duplicate error without processing subsequent mutations", async () => {
    const m1 = makeMutation("workout_log.create", { id: "id-1", client_id: "c1" });
    const m2 = makeMutation("workout_log.create", { id: "id-2", client_id: "c2" });
    vi.spyOn(queueModule, "peek").mockResolvedValue([m1, m2]);
    const removeSpy = vi.spyOn(queueModule, "remove");
    const bumpSpy = vi.spyOn(queueModule, "bumpError");
    mockInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    await replay();

    expect(removeSpy).toHaveBeenCalledWith("mut-1");
    expect(bumpSpy).not.toHaveBeenCalled();
  });
});

describe("installSyncListeners", () => {
  it("registers online and visibilitychange listeners", () => {
    const addEventListenerSpy = vi.fn();
    vi.stubGlobal("window", { addEventListener: addEventListenerSpy });
    vi.stubGlobal("document", { addEventListener: vi.fn() });
    vi.stubGlobal("navigator", { onLine: true });

    installSyncListeners();

    expect(addEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
  });
});

"use client";

import Dexie, { type Table } from "dexie";

export type PendingMutationKind =
  | "workout_log.create"
  | "workout_log.update_notes"
  | "set_log.create"
  | "workout.complete"
  | "message.send"
  | "exercise_note.upsert"
  | "exercise_note.delete";

export interface PendingMutation {
  id: string;                 // client-generated UUID (also used as message/set id for dedupe)
  kind: PendingMutationKind;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

class GainlyDB extends Dexie {
  pending_mutations!: Table<PendingMutation, string>;
  query_cache!: Table<{ key: string; data: unknown; updatedAt: number }, string>;

  constructor() {
    super("gainly");
    this.version(1).stores({
      pending_mutations: "id, kind, createdAt",
      query_cache: "key, updatedAt",
    });
  }
}

export const db =
  typeof window !== "undefined" ? new GainlyDB() : (null as unknown as GainlyDB);

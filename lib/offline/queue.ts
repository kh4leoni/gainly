"use client";

import { db, type PendingMutation, type PendingMutationKind } from "./db";
import { uuid } from "@/lib/utils";

export async function enqueue(kind: PendingMutationKind, payload: unknown, id?: string) {
  const entry: PendingMutation = {
    id: id ?? uuid(),
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await db.pending_mutations.put(entry);
  // Try to register Background Sync; harmless if unsupported.
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register("gainly-sync");
    } catch {
      /* noop */
    }
  }
  return entry.id;
}

export async function peek() {
  return db.pending_mutations.orderBy("createdAt").toArray();
}

export async function remove(id: string) {
  await db.pending_mutations.delete(id);
}

export async function bumpError(id: string, err: string) {
  const row = await db.pending_mutations.get(id);
  if (!row) return;
  row.attempts += 1;
  row.lastError = err;
  await db.pending_mutations.put(row);
}

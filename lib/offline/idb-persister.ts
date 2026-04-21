"use client";

import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

export function createIDBPersister(idbValidKey: IDBValidKey = "gainly-query-cache"): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbValidKey, client);
    },
    restoreClient: async () => {
      return (await get<PersistedClient>(idbValidKey)) ?? undefined;
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  };
}

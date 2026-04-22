"use client";

import { useState, useEffect } from "react";
import {
  PersistQueryClientProvider,
} from "@tanstack/react-query-persist-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/app-shell/theme-provider";
import { makeQueryClient } from "@/lib/query-client";
import { createIDBPersister } from "@/lib/offline/idb-persister";
import { installSyncListeners } from "@/lib/offline/sync";

let _client: ReturnType<typeof makeQueryClient> | undefined;

function getClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!_client) _client = makeQueryClient();
  return _client;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getClient);
  const [persister] = useState(() =>
    typeof window === "undefined" ? null : createIDBPersister()
  );

  useEffect(() => {
    installSyncListeners();
  }, []);

  if (!persister) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24h
          buster: "v1",
          dehydrateOptions: {
            shouldDehydrateQuery: (q) =>
              q.state.status === "success" && q.queryKey[0] !== "realtime",
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

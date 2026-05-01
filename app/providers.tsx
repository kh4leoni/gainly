"use client";

import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/app-shell/theme-provider";
import { makeQueryClient } from "@/lib/query-client";
import { installSyncListeners } from "@/lib/offline/sync";
import { NavigationProvider } from "@/lib/nav-context";

let _client: ReturnType<typeof makeQueryClient> | undefined;

function getClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!_client) _client = makeQueryClient();
  return _client;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getClient);

  useEffect(() => {
    return installSyncListeners();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>{children}</NavigationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

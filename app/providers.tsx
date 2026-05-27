"use client";

import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/app-shell/theme-provider";
import { makeQueryClient } from "@/lib/query-client";
import { installSyncListeners } from "@/lib/offline/sync";
import { installCacheIsolation } from "@/lib/auth/install-cache-isolation";
import { NavigationProvider } from "@/lib/nav-context";
import { PageTitleProvider } from "@/lib/page-title-context";

let _client: ReturnType<typeof makeQueryClient> | undefined;

function getClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!_client) _client = makeQueryClient();
  return _client;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getClient);

  useEffect(() => {
    const stopSync = installSyncListeners();
    const stopCache = installCacheIsolation();
    return () => { stopSync(); stopCache(); };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>
          <PageTitleProvider>{children}</PageTitleProvider>
        </NavigationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

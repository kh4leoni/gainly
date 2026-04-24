"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/app-shell/theme-provider";
import { makeQueryClient } from "@/lib/query-client";

let _client: ReturnType<typeof makeQueryClient> | undefined;

function getClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!_client) _client = makeQueryClient();
  return _client;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}

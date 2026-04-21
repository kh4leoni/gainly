import { cache } from "react";
import { makeQueryClient } from "./query-client";

// A request-scoped QueryClient for RSC prefetching.
export const getQueryClient = cache(() => makeQueryClient());

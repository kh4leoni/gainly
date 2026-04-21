# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (SW disabled in dev)
npm run build        # Production build + generates public/sw.js
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run lint         # ESLint (eslint-config-next)

# Database (requires Supabase CLI)
npm run db:reset     # supabase db reset — drops and re-runs all migrations + seed.sql
npm run db:push      # Push migrations to remote
npm run db:types     # Regenerate lib/supabase/database.types.ts from local schema

# Seed dev users (coach + 2 clients, password: "password")
tsx supabase/scripts/seed-users.ts

# E2E tests (Playwright, testDir: tests/e2e)
npx playwright test
npx playwright test --project=chromium tests/e2e/some.spec.ts  # single file
```

TypeScript is strict with `noUncheckedIndexedAccess` — always handle `T | undefined` from array access.

## Architecture

### Data fetching pattern
RSC pages call `getQueryClient()` (request-scoped via `React.cache()`), prefetch with `Promise.all([queryClient.prefetchQuery(...)])`, then wrap children in `<HydrationBoundary state={dehydrate(queryClient)}>`. Client components call `useSuspenseQuery` and never see a loading state. All query functions live in `lib/queries/` and accept a typed Supabase client.

### Supabase clients
- `lib/supabase/server.ts` — Server Components and Route Handlers (uses `next/headers` cookies)
- `lib/supabase/client.ts` — Client Components (browser singleton)
- `lib/supabase/middleware.ts` — `updateSession()` called in `middleware.ts` to refresh the session cookie

Never import the server client in a Client Component. Use `"use client"` boundary to switch.

### Authorization
RLS is the enforcement boundary. `is_coach_of(client_id)` and `is_client_of(coach_id)` SQL helpers are used in policies. The custom `custom_access_token_hook` PL/pgSQL function injects `user_role` into JWT app_metadata. Middleware reads this claim to gate `/coach/*` and `/client/*` routes; falls back to `profiles.role` DB query only if the claim is absent.

### Offline writes
1. Client calls `enqueue(kind, payload, uuid())` from `lib/offline/queue.ts` — writes to Dexie `pending_mutations` table and registers Background Sync tag `gainly-sync`.
2. SW handles the sync tag by postMessaging the page to trigger `replay()` from `lib/offline/sync.ts`.
3. `replay()` processes mutations FIFO; Postgres unique constraints make it idempotent (duplicate UUID → code 23505 → skip).
4. `installSyncListeners()` in `app/providers.tsx` also triggers replay on `online` event and `visibilitychange`.

Supported mutation kinds: `workout_log.create`, `set_log.create`, `workout.complete`, `message.send`.

### PR detection
A BEFORE INSERT trigger on `set_logs` computes the Epley 1RM and compares to existing `personal_records`. On improvement it upserts the PR row. A Supabase Realtime channel subscription in `hooks/use-pr-toast.ts` fires a toast.

### Service Worker (`app/sw.ts` → `public/sw.js`)
Built by `@serwist/next` during `npm run build` (disabled in dev). Caching strategies:
- Supabase REST (`**/rest/v1/**`): StaleWhileRevalidate
- Supabase Storage: CacheFirst
- RSC data (`/__nextjs_original-stack-frame*`): NetworkFirst (3 s timeout → cache)
- Navigation: NetworkFirst with offline fallback to `/offline`

### UI components
`components/ui/` contains hand-authored Radix UI primitives (not installed via shadcn CLI). CSS variables for theming are defined in `app/globals.css`. Use `cn()` from `lib/utils.ts` for conditional class merging.

### Query cache keys
Query keys follow the pattern `["resource", { filters }]`. The `"realtime"` key prefix is excluded from IDB persistence (passed to `shouldDehydrateQuery` filter in `app/providers.tsx`).

### Database schema overview
Core tables: `profiles`, `coach_clients`, `exercises`, `programs`, `program_weeks`, `program_days`, `program_exercises`, `scheduled_workouts`, `workout_logs`, `set_logs`, `personal_records`, `threads`, `messages`. After schema changes run `npm run db:types` to regenerate TypeScript types.

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

### Offline writes (mirror-table pattern)
Tables `scheduled_workouts`, `workout_logs`, `set_logs` are mirrored in Dexie (`gainly-offline` DB) with a `synced: 0|1` flag. All client writes go to Dexie first via helpers in `lib/offline/writes.ts`:
- `logSet`, `deleteSet` — `set_logs`
- `ensureWorkoutLog` — idempotent `workout_logs` row for a `(scheduled_workout, client)` pair
- `completeWorkout`, `uncompleteWorkout` — `scheduled_workouts.status`

UUIDs are generated client-side (`lib/offline/uuid.ts`, falls back to `uuid` pkg on platforms without `crypto.randomUUID`). Each row carries an `updated_at` set at write time.

`syncNow()` in `lib/offline/sync.ts` collects all `synced=0` rows, groups them by `workout_log_id`, and calls the SECURITY INVOKER RPC `upsert_workout_with_sets(p_scheduled, p_workout, p_sets)`. The RPC performs last-write-wins by `updated_at` and returns canonical rows; the client overwrites Dexie with `synced=1`. Mutex prevents concurrent runs.

Sync triggers: `online` event, `visibilitychange` (visible), `focus`, app mount, manual "Synkronoi nyt" button, Background Sync `gainly-sync` tag (Android-only — iOS Safari has no BG Sync API, fallbacks cover it). Listeners installed by `installSyncListeners()` in `app/providers.tsx`.

### Offline reads
`lib/offline/reads.ts` exposes `useLocalSetLogs`, `useLocalWorkoutLog`, `useUnsyncedCount` (Dexie `useLiveQuery`) and `mergeById` for LWW merge with server query results. Server queries call `hydrateSetLogs` / `hydrateWorkoutLog` to seed Dexie with `synced=1` so data survives going offline.

### Offline UX
- `components/offline/sync-bar.tsx` — sticky bar shown when `unsyncedCount > 0`. Indicates online/offline + running state. Manual "Synkronoi nyt" button.
- `components/offline/sync-badge.tsx` — per-row clock/check icon for unsynced/synced rows. Used inline in workout logger.

### PR detection
Single `after insert/update/delete` trigger on `set_logs` calls `recompute_pr_bucket(client, exercise, reps)` which picks the best weight (then estimated_1rm, then `wl.logged_at`) and upserts/clears `personal_records`. Trigger also refreshes `set_logs.is_pr` on the affected row. Late-arriving offline rows do not displace newer PRs because ordering uses `logged_at`. A Realtime channel in `hooks/use-pr-toast.ts` fires a toast on PR changes.

### Service Worker (`app/sw.ts` → `public/sw.js`)
Built by `@serwist/next` during `npm run build` (disabled in dev). Caching strategies:
- Supabase REST (`**/rest/v1/**`): StaleWhileRevalidate
- Supabase Storage: CacheFirst
- Navigation: NetworkFirst (3 s timeout) with offline fallback to `/offline`
- Static assets: serwist `defaultCache`

### UI components
`components/ui/` contains hand-authored Radix UI primitives (not installed via shadcn CLI). CSS variables for theming are defined in `app/globals.css`. Use `cn()` from `lib/utils.ts` for conditional class merging.

### Query cache keys
Query keys follow the pattern `["resource", { filters }]`. The `"realtime"` key prefix is excluded from IDB persistence (passed to `shouldDehydrateQuery` filter in `app/providers.tsx`).

### Database schema overview
Core tables: `profiles`, `coach_clients`, `exercises`, `programs`, `program_weeks`, `program_days`, `program_exercises`, `scheduled_workouts`, `workout_logs`, `set_logs`, `personal_records`, `threads`, `messages`. After schema changes run `npm run db:types` to regenerate TypeScript types.

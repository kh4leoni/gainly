# Gainly

AI-first digital coaching PWA. Next.js 15 (App Router, React 19) + Supabase + TanStack Query + Serwist.

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
- Docker (required by Supabase CLI for local Postgres)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `npx supabase status` (after starting) |

### 3. Start local Supabase

```bash
npx supabase start
```

This starts a local Postgres instance + Supabase Studio at `http://localhost:54323`.

### 4. Apply migrations + seed data

```bash
npm run db:reset
```

This runs all migrations in `supabase/migrations/` and seeds `supabase/seed.sql`.

### 5. Seed auth users (required after DB reset)

```bash
npx tsx supabase/scripts/seed-users.ts
```

Creates five dev users (password: `password` for all):

| Email | Role |
|---|---|
| `coach@gainly.local` | Coach |
| `client1@gainly.local` | Client |
| `client2@gainly.local` | Client |
| `valmentaja@testi.fi` | Coach |
| `asiakas@testi.fi` | Client |

### 5. Start dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

Supabase Studio (local DB browser) at `http://localhost:54323`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next dev server (SW disabled) |
| `npm run build` | Production build + generates service worker |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:reset` | Reset local DB, apply migrations, run seed |
| `npm run db:push` | Push migrations to remote Supabase |
| `npm run db:types` | Regenerate `lib/supabase/database.types.ts` from live schema |
| `npx tsx supabase/scripts/seed-users.ts` | Re-seed auth users after DB reset |

## Architecture

- **RSC + prefetch → HydrationBoundary** so first paint ships with populated cache.
- **Supabase nested selects** to collapse N+1 reads into one roundtrip.
- **TanStack Query + IDB persister** for instant repeat visits and SWR.
- **Serwist** service worker precaches the shell and runtime-caches Supabase GETs.
- **Dexie offline queue** for durable workout-log mutations, replayed via Background Sync.
- **Supabase Realtime** pushes new messages and PR events directly into the cache (no refetch).

## Database

Core tables: `profiles`, `coach_clients`, `exercises`, `programs`, `program_weeks`, `program_days`, `program_exercises`, `scheduled_workouts`, `workout_logs`, `set_logs`, `personal_records`, `threads`, `messages`.

RLS is the authorization boundary. `is_coach_of(client_id)` and `is_client_of(coach_id)` SQL helpers used in policies. After schema changes run `npm run db:types` to regenerate TypeScript types.

## Dev users (local Supabase)

Log in with any seeded email and password `password`. Coach accounts have access to `/coach/*`, client accounts to `/client/*`.

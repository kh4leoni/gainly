# Gainly

AI-first digital coaching PWA. Next.js 15 (App Router, React 19) + Supabase + TanStack Query + Serwist.

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npx supabase start           # local Postgres + Studio
npx supabase db reset        # apply migrations + seed
npm run dev
```

## Architecture

- **RSC + prefetch → HydrationBoundary** so first paint ships with populated cache.
- **Supabase nested selects** to collapse N+1 reads into one roundtrip.
- **TanStack Query + IDB persister** for instant repeat visits and SWR.
- **Serwist** service worker precaches the shell and runtime-caches Supabase GETs.
- **Dexie offline queue** for durable workout-log mutations, replayed via Background Sync.
- **Supabase Realtime** pushes new messages and PR events directly into the cache (no refetch).

## Performance budgets

- LCP < 1.5s on 4G
- INP < 200ms
- Initial JS < 180kb

See `lib/perf/` for RUM hooks.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build (generates SW) |
| `npm run db:reset` | Reset local Supabase DB and apply migrations |
| `npm run db:types` | Regenerate TS types from DB |

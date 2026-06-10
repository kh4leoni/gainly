-- =====================================================================
-- Fineli food composition data (for meal plans)
-- Source: THL / Fineli open data, licensed CC BY 4.0.
-- Populated by supabase/scripts/import-fineli.ts (not seeded here — the
-- dump is ~4000 rows and lives in version-independent open data).
-- All nutrient values are per 100 g of edible portion.
-- =====================================================================

create extension if not exists pg_trgm;

create table public.foods (
  id          bigint primary key,           -- Fineli FOODID (stable across releases)
  name_fi     text not null,
  name_en     text,
  energy_kcal numeric,
  protein_g   numeric,
  fat_g       numeric,
  carb_g      numeric,
  fiber_g     numeric,
  sugar_g     numeric,
  created_at  timestamptz not null default now()
);

-- Trigram index powers the coach's food-search popover (ILIKE '%query%').
create index foods_name_fi_trgm on public.foods using gin (name_fi gin_trgm_ops);
create index foods_name_en_trgm on public.foods using gin (name_en gin_trgm_ops);

alter table public.foods enable row level security;

-- Reference data: any authenticated user may read; nobody writes via the
-- API (the import script uses the service role, which bypasses RLS).
create policy "authenticated reads foods" on public.foods
  for select to authenticated using (true);

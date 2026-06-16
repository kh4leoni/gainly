-- =====================================================================
-- Plans (suunnitelmat)
-- A freeform, Excel-style progression scratchpad: rows = exercises,
-- columns = weeks, cells = rough prescription text ("3x8 80kg @7").
-- A coach uses it to sketch a macro progression and then models the real
-- program editor after it. It is a rough draft, not normalized data, so the
-- whole grid lives in a single jsonb blob.
--
-- grid shape:
--   {
--     "weekLabels": string[],                       -- per-week header (e.g. "Deload")
--     "rows": [
--       { "id": string,                             -- client-generated uuid
--         "exerciseId": uuid | null,                -- optional link to exercises
--         "label": string,                          -- exercise / row name
--         "cells": string[] }                       -- one free-text value per week
--     ]
--   }
-- =====================================================================

create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  -- null = unattached reusable plan; otherwise tagged to one client.
  client_id   uuid references public.profiles(id) on delete set null,
  title       text not null default 'Uusi suunnitelma',
  weeks       int  not null default 4 check (weeks between 1 and 52),
  grid        jsonb not null default '{"weekLabels": [], "rows": []}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.plans (coach_id, updated_at desc);

alter table public.plans enable row level security;

-- A coach reads/writes their own plans; a tagged client may read.
create policy "read own or assigned" on public.plans
  for select using (coach_id = auth.uid() or client_id = auth.uid());
create policy "coach writes own" on public.plans
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Keep updated_at fresh on every write so the list can sort by recency.
create or replace function public.touch_plans_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_plans_updated_at();

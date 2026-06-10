-- =====================================================================
-- Meal plans (ruokaohjelmat)
-- Mirrors the programs → days → items shape. A plan with client_id = null
-- is a reusable template; otherwise it is assigned to one client.
-- =====================================================================

create table public.meal_plans (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  client_id   uuid references public.profiles(id) on delete set null,
  title       text not null,
  description text,
  is_template boolean generated always as (client_id is null) stored,
  created_at  timestamptz not null default now()
);
create index on public.meal_plans (coach_id, client_id);

create table public.meal_plan_days (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.meal_plans(id) on delete cascade,
  day_number  int not null,
  name        text,
  unique (plan_id, day_number)
);

create table public.meals (
  id          uuid primary key default gen_random_uuid(),
  day_id      uuid not null references public.meal_plan_days(id) on delete cascade,
  order_idx   int not null,
  name        text,
  notes       text
);
create index on public.meals (day_id, order_idx);

create table public.meal_items (
  id          uuid primary key default gen_random_uuid(),
  meal_id     uuid not null references public.meals(id) on delete cascade,
  food_id     bigint references public.foods(id) on delete set null,
  -- Snapshot the name so an item survives a food being removed/renamed in a
  -- later Fineli import, and free-text items (no food_id) are possible.
  food_name   text not null,
  amount_g    numeric not null default 100,
  order_idx   int not null default 0
);
create index on public.meal_items (meal_id, order_idx);

-- ---------------------------------------------------------------------
-- RLS — mirrors the programs family
-- ---------------------------------------------------------------------
alter table public.meal_plans     enable row level security;
alter table public.meal_plan_days enable row level security;
alter table public.meals          enable row level security;
alter table public.meal_items     enable row level security;

create or replace function public.can_access_meal_plan(_plan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.meal_plans p
    where p.id = _plan
      and (p.coach_id = auth.uid() or p.client_id = auth.uid())
  );
$$;

create or replace function public.can_modify_meal_plan(_plan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.meal_plans p
    where p.id = _plan and p.coach_id = auth.uid()
  );
$$;

-- meal_plans
create policy "read own or assigned" on public.meal_plans
  for select using (coach_id = auth.uid() or client_id = auth.uid());
create policy "coach writes own" on public.meal_plans
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- meal_plan_days
create policy "read meal_plan_days" on public.meal_plan_days
  for select using (public.can_access_meal_plan(plan_id));
create policy "write meal_plan_days" on public.meal_plan_days
  for all using (public.can_modify_meal_plan(plan_id))
  with check (public.can_modify_meal_plan(plan_id));

-- meals
create policy "read meals" on public.meals
  for select using (
    exists (select 1 from public.meal_plan_days d
            where d.id = day_id and public.can_access_meal_plan(d.plan_id))
  );
create policy "write meals" on public.meals
  for all using (
    exists (select 1 from public.meal_plan_days d
            where d.id = day_id and public.can_modify_meal_plan(d.plan_id))
  )
  with check (
    exists (select 1 from public.meal_plan_days d
            where d.id = day_id and public.can_modify_meal_plan(d.plan_id))
  );

-- meal_items
create policy "read meal_items" on public.meal_items
  for select using (
    exists (
      select 1 from public.meals m
      join public.meal_plan_days d on d.id = m.day_id
      where m.id = meal_id and public.can_access_meal_plan(d.plan_id)
    )
  );
create policy "write meal_items" on public.meal_items
  for all using (
    exists (
      select 1 from public.meals m
      join public.meal_plan_days d on d.id = m.day_id
      where m.id = meal_id and public.can_modify_meal_plan(d.plan_id)
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      join public.meal_plan_days d on d.id = m.day_id
      where m.id = meal_id and public.can_modify_meal_plan(d.plan_id)
    )
  );

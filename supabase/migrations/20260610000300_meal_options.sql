-- =====================================================================
-- Meal options (ateriavaihtoehdot)
-- A meal can offer several interchangeable options ("Kaurapuuro" /
-- "Munakas"); the client picks one and the macros follow. Items now hang
-- off an option instead of the meal directly. A meal always has ≥1 option.
-- =====================================================================

create table public.meal_options (
  id        uuid primary key default gen_random_uuid(),
  meal_id   uuid not null references public.meals(id) on delete cascade,
  order_idx int not null default 0,
  name      text   -- null → UI shows "Vaihtoehto N"
);
create index on public.meal_options (meal_id, order_idx);

-- Backfill: one default option per existing meal, then re-home items.
insert into public.meal_options (meal_id, order_idx, name)
select id, 0, null from public.meals;

alter table public.meal_items
  add column meal_option_id uuid references public.meal_options(id) on delete cascade;

update public.meal_items mi
set meal_option_id = mo.id
from public.meal_options mo
where mo.meal_id = mi.meal_id;

alter table public.meal_items alter column meal_option_id set not null;

-- Old meal_items policies reference meal_id — drop them before the column.
drop policy if exists "read meal_items" on public.meal_items;
drop policy if exists "write meal_items" on public.meal_items;

alter table public.meal_items drop column meal_id;
create index on public.meal_items (meal_option_id, order_idx);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.meal_options enable row level security;

create policy "read meal_options" on public.meal_options
  for select using (
    exists (
      select 1 from public.meals m
      join public.meal_plan_days d on d.id = m.day_id
      where m.id = meal_id and public.can_access_meal_plan(d.plan_id)
    )
  );
create policy "write meal_options" on public.meal_options
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

-- meal_items now reached via option → meal → day → plan.
create policy "read meal_items" on public.meal_items
  for select using (
    exists (
      select 1 from public.meal_options o
      join public.meals m on m.id = o.meal_id
      join public.meal_plan_days d on d.id = m.day_id
      where o.id = meal_option_id and public.can_access_meal_plan(d.plan_id)
    )
  );
create policy "write meal_items" on public.meal_items
  for all using (
    exists (
      select 1 from public.meal_options o
      join public.meals m on m.id = o.meal_id
      join public.meal_plan_days d on d.id = m.day_id
      where o.id = meal_option_id and public.can_modify_meal_plan(d.plan_id)
    )
  )
  with check (
    exists (
      select 1 from public.meal_options o
      join public.meals m on m.id = o.meal_id
      join public.meal_plan_days d on d.id = m.day_id
      where o.id = meal_option_id and public.can_modify_meal_plan(d.plan_id)
    )
  );

-- ---------------------------------------------------------------------
-- copy_meal_plan — now also deep-copies options.
-- ---------------------------------------------------------------------
create or replace function public.copy_meal_plan(_source uuid, _client uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  _new_plan uuid;
  _new_day  uuid;
  _new_meal uuid;
  _new_opt  uuid;
  _day  record;
  _meal record;
  _opt  record;
begin
  if not exists (
    select 1 from public.meal_plans
    where id = _source and coach_id = auth.uid() and client_id is null
  ) then
    raise exception 'only template meal plans can be assigned';
  end if;

  insert into public.meal_plans (coach_id, client_id, title, description)
  select coach_id, _client, title, description
  from public.meal_plans where id = _source
  returning id into _new_plan;

  for _day in
    select * from public.meal_plan_days where plan_id = _source order by day_number
  loop
    insert into public.meal_plan_days (plan_id, day_number, name)
    values (_new_plan, _day.day_number, _day.name) returning id into _new_day;

    for _meal in
      select * from public.meals where day_id = _day.id order by order_idx
    loop
      insert into public.meals (day_id, order_idx, name, notes)
      values (_new_day, _meal.order_idx, _meal.name, _meal.notes)
      returning id into _new_meal;

      for _opt in
        select * from public.meal_options where meal_id = _meal.id order by order_idx
      loop
        insert into public.meal_options (meal_id, order_idx, name)
        values (_new_meal, _opt.order_idx, _opt.name) returning id into _new_opt;

        insert into public.meal_items (meal_option_id, food_id, food_name, amount_g, order_idx)
        select _new_opt, food_id, food_name, amount_g, order_idx
        from public.meal_items where meal_option_id = _opt.id;
      end loop;
    end loop;
  end loop;

  return _new_plan;
end $$;

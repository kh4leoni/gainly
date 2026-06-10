-- =====================================================================
-- copy_meal_plan: assign a template meal plan to a client.
-- Mirrors copy_program — deep-copies days → meals → items into a new
-- client-assigned plan. Lets a coach build one plan and hand it to many.
-- =====================================================================

create or replace function public.copy_meal_plan(_source uuid, _client uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  _new_plan uuid;
  _new_day  uuid;
  _new_meal uuid;
  _day  record;
  _meal record;
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

      insert into public.meal_items (meal_id, food_id, food_name, amount_g, order_idx)
      select _new_meal, food_id, food_name, amount_g, order_idx
      from public.meal_items where meal_id = _meal.id;
    end loop;
  end loop;

  return _new_plan;
end $$;

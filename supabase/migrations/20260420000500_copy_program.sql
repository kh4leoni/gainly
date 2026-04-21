create or replace function public.copy_program(_source uuid, _client uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  _new_prog uuid;
  _new_week uuid;
  _new_day  uuid;
  _week record;
  _day  record;
begin
  if not exists (
    select 1 from public.programs where id = _source and coach_id = auth.uid() and client_id is null
  ) then
    raise exception 'only template programs can be assigned';
  end if;

  insert into public.programs (coach_id, client_id, title, description)
  select coach_id, _client, title, description
  from public.programs where id = _source
  returning id into _new_prog;

  for _week in
    select * from public.program_weeks where program_id = _source order by week_number
  loop
    insert into public.program_weeks (program_id, week_number)
    values (_new_prog, _week.week_number) returning id into _new_week;

    for _day in
      select * from public.program_days where week_id = _week.id order by day_number
    loop
      insert into public.program_days (week_id, day_number, name)
      values (_new_week, _day.day_number, _day.name) returning id into _new_day;

      insert into public.program_exercises
        (day_id, exercise_id, order_idx, sets, reps, intensity, intensity_type, rest_sec, notes)
      select _new_day, exercise_id, order_idx, sets, reps, intensity, intensity_type, rest_sec, notes
      from public.program_exercises where day_id = _day.id;
    end loop;
  end loop;

  return _new_prog;
end $$;

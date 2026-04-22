-- =====================================================================
-- RPE integration: target RPE per program exercise + RPE-adjusted e1RM
-- =====================================================================

-- 1. Target RPE on program_exercises (0 = "< 6", 6.0-10.0 in 0.5 increments)
alter table public.program_exercises
  add column target_rpe numeric
  check (
    target_rpe is null
    or (target_rpe >= 0 and target_rpe <= 10 and (target_rpe * 2) = floor(target_rpe * 2))
  );

-- 2. Rewrite estimated_1rm generated column with RPE-adjusted Epley:
--    e1RM = weight * (1 + (reps + (10 - rpe)) / 30)
--    When rpe is null we assume RPE 10 (no reps in reserve) -> plain Epley.
alter table public.set_logs drop column estimated_1rm cascade;

alter table public.set_logs add column estimated_1rm numeric generated always as (
  case when weight is null or reps is null or reps = 0
    then null
    else weight * (1 + (reps + (10 - coalesce(rpe, 10))) / 30.0)
  end
) stored;

create index on public.set_logs (exercise_id, estimated_1rm desc);

-- 3. Update PR trigger's inline math to match the new formula.
create or replace function public.before_set_log_pr() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rep_range_label text;
  existing numeric;
  _client_id uuid;
  _est numeric;
begin
  if NEW.reps is null or NEW.weight is null or NEW.reps = 0 then
    return NEW;
  end if;

  rep_range_label := case
    when NEW.reps = 1             then '1RM'
    when NEW.reps between 2 and 3 then '3RM'
    when NEW.reps between 4 and 5 then '5RM'
    else null
  end;
  if rep_range_label is null then return NEW; end if;

  _est := NEW.weight * (1 + (NEW.reps + (10 - coalesce(NEW.rpe, 10))) / 30.0);

  select client_id into _client_id from public.workout_logs where id = NEW.workout_log_id;

  select estimated_1rm into existing
  from public.personal_records
  where client_id = _client_id
    and exercise_id = NEW.exercise_id
    and rep_range = rep_range_label;

  if existing is null or _est > existing then
    NEW.is_pr := true;
  end if;

  return NEW;
end $$;

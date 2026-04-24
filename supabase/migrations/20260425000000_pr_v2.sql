-- =====================================================================
-- PR v2: single "effective 1RM" row per (client, exercise).
-- N-RM values for N in 1..5 are derived client-side via inverse Epley,
-- keeping coach and client views identical.
--
-- Formula (mirror lib/calc/one-rm.ts):
--   RIR            = greatest(0, 10 - rpe)
--   effective_reps = reps + RIR
--   e1RM           = weight * (1 + effective_reps / 30)
--
-- When rpe is null we assume RPE 10 (no RIR) -> plain Epley.
-- =====================================================================

-- 1. Keep estimated_1rm generated column aligned with util (clamped RIR).
alter table public.set_logs drop column estimated_1rm cascade;

alter table public.set_logs add column estimated_1rm numeric generated always as (
  case when weight is null or reps is null or reps = 0
    then null
    else weight * (1 + (reps + greatest(0, 10 - coalesce(rpe, 10))) / 30.0)
  end
) stored;

create index if not exists set_logs_exercise_e1rm_idx
  on public.set_logs (exercise_id, estimated_1rm desc);

-- 2. Drop legacy bucket rows. We now track only the single best e1RM row
--    per (client, exercise) under rep_range = '1RM'.
delete from public.personal_records where rep_range <> '1RM';

-- 3. Back-fill 1RM rows for any (client, exercise) whose best set doesn't
--    already have a record. Uses the newly-recomputed estimated_1rm.
insert into public.personal_records
  (client_id, exercise_id, rep_range, weight, reps, estimated_1rm, set_log_id, achieved_at)
select
  wl.client_id,
  sl.exercise_id,
  '1RM' as rep_range,
  sl.weight,
  sl.reps,
  sl.estimated_1rm,
  sl.id,
  wl.logged_at
from public.set_logs sl
join public.workout_logs wl on wl.id = sl.workout_log_id
join lateral (
  select sl2.id
  from public.set_logs sl2
  join public.workout_logs wl2 on wl2.id = sl2.workout_log_id
  where wl2.client_id = wl.client_id
    and sl2.exercise_id = sl.exercise_id
    and sl2.estimated_1rm is not null
  order by sl2.estimated_1rm desc nulls last, wl2.logged_at desc
  limit 1
) best on best.id = sl.id
on conflict (client_id, exercise_id, rep_range) do update
  set weight        = excluded.weight,
      reps          = excluded.reps,
      estimated_1rm = excluded.estimated_1rm,
      set_log_id    = excluded.set_log_id,
      achieved_at   = excluded.achieved_at;

-- 4. Rewrite PR triggers: single '1RM' row per exercise, upsert if higher.
create or replace function public.before_set_log_pr() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  existing numeric;
  _client_id uuid;
  _est numeric;
begin
  if NEW.reps is null or NEW.weight is null or NEW.reps = 0 then
    return NEW;
  end if;

  _est := NEW.weight * (1 + (NEW.reps + greatest(0, 10 - coalesce(NEW.rpe, 10))) / 30.0);

  select client_id into _client_id from public.workout_logs where id = NEW.workout_log_id;

  select estimated_1rm into existing
  from public.personal_records
  where client_id = _client_id
    and exercise_id = NEW.exercise_id
    and rep_range = '1RM';

  if existing is null or _est > existing then
    NEW.is_pr := true;
  end if;

  return NEW;
end $$;

create or replace function public.after_set_log_pr() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _client_id uuid;
begin
  if not NEW.is_pr then return NEW; end if;

  select client_id into _client_id from public.workout_logs where id = NEW.workout_log_id;

  insert into public.personal_records
    (client_id, exercise_id, rep_range, weight, reps, estimated_1rm, set_log_id)
  values
    (_client_id, NEW.exercise_id, '1RM', NEW.weight, NEW.reps, NEW.estimated_1rm, NEW.id)
  on conflict (client_id, exercise_id, rep_range) do update
    set weight        = excluded.weight,
        reps          = excluded.reps,
        estimated_1rm = excluded.estimated_1rm,
        set_log_id    = excluded.set_log_id,
        achieved_at   = now();
  return NEW;
end $$;

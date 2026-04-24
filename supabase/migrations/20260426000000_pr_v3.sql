-- =====================================================================
-- PR v3: per-rep bucket (1..5) with RTS/Tuchscherer + Lennart Mai math.
--
-- Changes:
--   1. rts_intensity(reps, rpe) lookup function mirrors lib/calc/one-rm.ts
--   2. set_logs.estimated_1rm generated column rewritten to use rts_intensity
--   3. personal_records: drop rep_range, add reps int (1..5),
--      unique (client_id, exercise_id, reps)
--   4. Single AFTER INSERT/UPDATE/DELETE trigger that recomputes the
--      affected (client, exercise, reps) bucket from scratch, so edits
--      can lower the PR.
--   5. Backfill.
-- =====================================================================

-- 1. rts_intensity(reps, rpe) ------------------------------------------
-- Values from RTS / Tuchscherer tables; reps 1..12 x rpe 6..10 step 0.5.
-- Fallback for out-of-range combos: Lennart Mai formula.
create or replace function public.rts_intensity(p_reps int, p_rpe numeric)
returns numeric language plpgsql immutable as $$
declare
  v numeric;
  x numeric;
  r numeric;
begin
  r := coalesce(p_rpe, 10);

  v := case p_reps
    when 1 then case r
      when 10 then 100.0 when 9.5 then 97.5 when 9 then 95.5
      when 8.5 then 93.5 when 8 then 92.0 when 7.5 then 90.5
      when 7 then 89.0 when 6.5 then 87.5 when 6 then 86.0
      else null end
    when 2 then case r
      when 10 then 95.5 when 9.5 then 93.9 when 9 then 92.2
      when 8.5 then 91.0 when 8 then 89.5 when 7.5 then 88.0
      when 7 then 86.5 when 6.5 then 85.0 when 6 then 83.7
      else null end
    when 3 then case r
      when 10 then 92.2 when 9.5 then 90.7 when 9 then 89.0
      when 8.5 then 87.8 when 8 then 86.3 when 7.5 then 85.0
      when 7 then 83.7 when 6.5 then 82.5 when 6 then 81.0
      else null end
    when 4 then case r
      when 10 then 89.0 when 9.5 then 87.8 when 9 then 86.3
      when 8.5 then 85.0 when 8 then 83.7 when 7.5 then 82.4
      when 7 then 81.1 when 6.5 then 79.9 when 6 then 78.7
      else null end
    when 5 then case r
      when 10 then 86.3 when 9.5 then 85.0 when 9 then 83.7
      when 8.5 then 82.4 when 8 then 81.1 when 7.5 then 79.9
      when 7 then 78.7 when 6.5 then 77.4 when 6 then 76.2
      else null end
    when 6 then case r
      when 10 then 83.7 when 9.5 then 82.4 when 9 then 81.1
      when 8.5 then 79.9 when 8 then 78.7 when 7.5 then 77.4
      when 7 then 76.2 when 6.5 then 75.1 when 6 then 73.9
      else null end
    when 7 then case r
      when 10 then 81.1 when 9.5 then 79.9 when 9 then 78.7
      when 8.5 then 77.4 when 8 then 76.2 when 7.5 then 75.1
      when 7 then 73.9 when 6.5 then 72.3 when 6 then 71.6
      else null end
    when 8 then case r
      when 10 then 78.7 when 9.5 then 77.4 when 9 then 76.2
      when 8.5 then 75.1 when 8 then 73.9 when 7.5 then 72.3
      when 7 then 71.6 when 6.5 then 70.5 when 6 then 69.4
      else null end
    when 9 then case r
      when 10 then 76.2 when 9.5 then 75.1 when 9 then 73.9
      when 8.5 then 72.3 when 8 then 71.6 when 7.5 then 70.5
      when 7 then 69.4 when 6.5 then 68.0 when 6 then 67.0
      else null end
    when 10 then case r
      when 10 then 73.9 when 9.5 then 72.3 when 9 then 71.6
      when 8.5 then 70.5 when 8 then 69.4 when 7.5 then 68.0
      when 7 then 67.0 when 6.5 then 65.0 when 6 then 64.3
      else null end
    when 11 then case r
      when 10 then 71.6 when 9.5 then 70.5 when 9 then 69.4
      when 8.5 then 68.0 when 8 then 67.0 when 7.5 then 65.0
      when 7 then 63.6 when 6.5 then 62.6 when 6 then 61.6
      else null end
    when 12 then case r
      when 10 then 69.4 when 9.5 then 68.0 when 9 then 67.0
      when 8.5 then 65.0 when 8 then 63.6 when 7.5 then 62.6
      when 7 then 61.6 when 6.5 then 60.3 when 6 then 59.2
      else null end
    else null
  end;

  if v is null then
    -- Lennart Mai fallback. x = reps + RIR.
    x := p_reps + greatest(0, 10 - r);
    v := 101.437 - 2.360 * x - 0.0197 * x * x;
  end if;

  return greatest(v, 1); -- clamp to avoid divide-by-zero
end $$;

-- 2. Redefine set_logs.estimated_1rm -----------------------------------
alter table public.set_logs drop column estimated_1rm cascade;

alter table public.set_logs add column estimated_1rm numeric
  generated always as (
    case when weight is null or reps is null or reps = 0 then null
         else weight * 100.0 / public.rts_intensity(reps, coalesce(rpe, 10))
    end
  ) stored;

create index if not exists set_logs_exercise_e1rm_idx
  on public.set_logs (exercise_id, estimated_1rm desc);

-- 3. personal_records: per-rep bucket ----------------------------------
-- Drop old data + rep_range column (cascade removes its unique constraint).
-- `reps` column already exists from init schema; tighten to NOT NULL + check.
delete from public.personal_records;
alter table public.personal_records drop column rep_range cascade;
alter table public.personal_records alter column reps set not null;
alter table public.personal_records add constraint personal_records_reps_check
  check (reps between 1 and 5);
alter table public.personal_records
  add constraint personal_records_client_exercise_reps_key
  unique (client_id, exercise_id, reps);

-- 4. Replace triggers --------------------------------------------------
drop trigger if exists set_logs_pr_before on public.set_logs;
drop trigger if exists set_logs_pr_after  on public.set_logs;
drop function if exists public.before_set_log_pr();
drop function if exists public.after_set_log_pr();

create or replace function public.recompute_pr_bucket(
  p_client uuid, p_exercise uuid, p_reps int
) returns void language plpgsql security definer set search_path = public as $$
declare
  has_rows boolean;
begin
  if p_reps is null or p_reps < 1 or p_reps > 5 then return; end if;

  select exists (
    select 1 from public.set_logs sl
    join public.workout_logs wl on wl.id = sl.workout_log_id
    where wl.client_id = p_client
      and sl.exercise_id = p_exercise
      and sl.reps = p_reps
      and sl.weight is not null
  ) into has_rows;

  if not has_rows then
    delete from public.personal_records
    where client_id = p_client and exercise_id = p_exercise and reps = p_reps;
    return;
  end if;

  with best as (
    select sl.id, sl.weight, sl.reps, sl.estimated_1rm, wl.logged_at
    from public.set_logs sl
    join public.workout_logs wl on wl.id = sl.workout_log_id
    where wl.client_id = p_client
      and sl.exercise_id = p_exercise
      and sl.reps = p_reps
      and sl.weight is not null
    order by sl.weight desc nulls last,
             sl.estimated_1rm desc nulls last,
             wl.logged_at desc
    limit 1
  )
  insert into public.personal_records
    (client_id, exercise_id, reps, weight, estimated_1rm, set_log_id, achieved_at)
  select p_client, p_exercise, p_reps, b.weight, b.estimated_1rm, b.id, b.logged_at
  from best b
  on conflict (client_id, exercise_id, reps) do update
    set weight        = excluded.weight,
        estimated_1rm = excluded.estimated_1rm,
        set_log_id    = excluded.set_log_id,
        achieved_at   = excluded.achieved_at;
end $$;

create or replace function public.on_set_log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _client uuid;
  _new_exercise uuid;
  _new_reps int;
  _old_exercise uuid;
  _old_reps int;
  _is_pr_row boolean;
begin
  -- Resolve client_id from the involved workout_log.
  select client_id into _client
  from public.workout_logs
  where id = coalesce(
    case when TG_OP = 'DELETE' then OLD.workout_log_id else NEW.workout_log_id end,
    case when TG_OP = 'DELETE' then NULL else NEW.workout_log_id end
  );

  if TG_OP in ('INSERT','UPDATE') then
    _new_exercise := NEW.exercise_id;
    _new_reps := NEW.reps;
  end if;
  if TG_OP in ('UPDATE','DELETE') then
    _old_exercise := OLD.exercise_id;
    _old_reps := OLD.reps;
  end if;

  -- Recompute affected buckets.
  if _client is not null and _new_exercise is not null and _new_reps is not null then
    perform public.recompute_pr_bucket(_client, _new_exercise, _new_reps);
  end if;
  if _client is not null and _old_exercise is not null and _old_reps is not null
     and (TG_OP = 'DELETE' or _old_exercise <> _new_exercise or _old_reps <> _new_reps) then
    perform public.recompute_pr_bucket(_client, _old_exercise, _old_reps);
  end if;

  -- Refresh is_pr flag on the affected row (INSERT/UPDATE only).
  if TG_OP in ('INSERT','UPDATE') and _client is not null then
    select exists (
      select 1 from public.personal_records pr
      where pr.client_id = _client
        and pr.exercise_id = NEW.exercise_id
        and pr.reps = NEW.reps
        and pr.set_log_id = NEW.id
    ) into _is_pr_row;

    update public.set_logs
    set is_pr = coalesce(_is_pr_row, false)
    where id = NEW.id
      and is_pr is distinct from coalesce(_is_pr_row, false);
  end if;

  return coalesce(NEW, OLD);
end $$;

create trigger set_logs_change_trg
  after insert or update or delete on public.set_logs
  for each row execute function public.on_set_log_change();

-- 5. Backfill ----------------------------------------------------------
-- For each (client, exercise, reps) pick the best weight; ties broken by e1rm, then recency.
insert into public.personal_records
  (client_id, exercise_id, reps, weight, estimated_1rm, set_log_id, achieved_at)
select distinct on (wl.client_id, sl.exercise_id, sl.reps)
  wl.client_id, sl.exercise_id, sl.reps, sl.weight, sl.estimated_1rm, sl.id, wl.logged_at
from public.set_logs sl
join public.workout_logs wl on wl.id = sl.workout_log_id
where sl.reps between 1 and 5 and sl.weight is not null
order by wl.client_id, sl.exercise_id, sl.reps,
         sl.weight desc nulls last,
         sl.estimated_1rm desc nulls last,
         wl.logged_at desc
on conflict (client_id, exercise_id, reps) do update
  set weight = excluded.weight,
      estimated_1rm = excluded.estimated_1rm,
      set_log_id = excluded.set_log_id,
      achieved_at = excluded.achieved_at;

-- Refresh is_pr flags on set_logs.
update public.set_logs sl
set is_pr = exists (
  select 1 from public.personal_records pr
  where pr.set_log_id = sl.id
)
where sl.reps between 1 and 5;

-- =====================================================================
-- Deduplicate workout_logs per (scheduled_workout_id, client_id) and
-- enforce uniqueness going forward.
--
-- Root cause: maybeSingle() in the client logger errored when >1 log row
-- existed for a workout, causing the UI to create another new log. Each
-- fresh log took any newly-logged set_logs, stranding data on earlier
-- rows. Coach / client views showed an arbitrary "first" log and missed
-- the data on the others.
-- =====================================================================

-- 1. Merge duplicates: keep the earliest workout_log per
--    (scheduled_workout_id, client_id); move set_logs and
--    workout_exercise_notes onto the kept row; drop the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by scheduled_workout_id, client_id
      order by logged_at asc, id asc
    ) as rn,
    first_value(id) over (
      partition by scheduled_workout_id, client_id
      order by logged_at asc, id asc
      rows between unbounded preceding and unbounded following
    ) as keep_id
  from public.workout_logs
  where scheduled_workout_id is not null
)
update public.set_logs sl
  set workout_log_id = r.keep_id
from ranked r
where sl.workout_log_id = r.id
  and r.rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by scheduled_workout_id, client_id
      order by logged_at asc, id asc
    ) as rn,
    first_value(id) over (
      partition by scheduled_workout_id, client_id
      order by logged_at asc, id asc
      rows between unbounded preceding and unbounded following
    ) as keep_id
  from public.workout_logs
  where scheduled_workout_id is not null
)
update public.workout_exercise_notes wen
  set workout_log_id = r.keep_id
from ranked r
where wen.workout_log_id = r.id
  and r.rn > 1
  and not exists (
    select 1 from public.workout_exercise_notes existing
    where existing.workout_log_id = r.keep_id
      and existing.program_exercise_id = wen.program_exercise_id
  );

-- Remaining notes on duplicates are dropped by cascade when the
-- duplicate workout_log rows are deleted below.
with ranked as (
  select
    id,
    row_number() over (
      partition by scheduled_workout_id, client_id
      order by logged_at asc, id asc
    ) as rn
  from public.workout_logs
  where scheduled_workout_id is not null
)
delete from public.workout_logs wl
using ranked r
where wl.id = r.id and r.rn > 1;

-- 2. Lock it down. Partial unique index (scheduled_workout_id may be null
--    for ad-hoc logs that aren't tied to a scheduled workout).
create unique index if not exists workout_logs_scheduled_client_uq
  on public.workout_logs (scheduled_workout_id, client_id)
  where scheduled_workout_id is not null;

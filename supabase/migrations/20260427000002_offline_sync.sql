-- =====================================================================
-- Offline sync support: updated_at columns + RPC for atomic LWW upsert.
--
-- Clients write to Dexie offline, then call upsert_workout_with_sets
-- with the parent scheduled_workout, workout_log, and child set_logs
-- in a single transaction. Last-write-wins by updated_at; the server
-- returns canonical rows so the client can reconcile its mirror.
-- =====================================================================

-- 1. updated_at columns + trigger -------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  NEW.updated_at := now();
  return NEW;
end $$;

alter table public.scheduled_workouts
  add column if not exists updated_at timestamptz not null default now();
alter table public.workout_logs
  add column if not exists updated_at timestamptz not null default now();
alter table public.set_logs
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists scheduled_workouts_set_updated_at on public.scheduled_workouts;
create trigger scheduled_workouts_set_updated_at
  before update on public.scheduled_workouts
  for each row execute function public.set_updated_at();

drop trigger if exists workout_logs_set_updated_at on public.workout_logs;
create trigger workout_logs_set_updated_at
  before update on public.workout_logs
  for each row execute function public.set_updated_at();

drop trigger if exists set_logs_set_updated_at on public.set_logs;
create trigger set_logs_set_updated_at
  before update on public.set_logs
  for each row execute function public.set_updated_at();

create index if not exists scheduled_workouts_updated_at_idx
  on public.scheduled_workouts (client_id, updated_at desc);
create index if not exists workout_logs_updated_at_idx
  on public.workout_logs (client_id, updated_at desc);
create index if not exists set_logs_updated_at_idx
  on public.set_logs (workout_log_id, updated_at desc);

-- 2. RPC upsert_workout_with_sets -------------------------------------
-- p_scheduled: jsonb with id, status, completed_at, updated_at (nullable: skip if null)
-- p_workout:   jsonb with id, scheduled_workout_id, client_id, logged_at, updated_at
-- p_sets:      jsonb array of { id, workout_log_id, exercise_id, program_exercise_id,
--                               set_number, weight, reps, rpe, updated_at }
--
-- LWW: if existing row's updated_at > incoming, server row wins (no-op).
-- Returns the canonical rows so the client overwrites its Dexie mirror.

create or replace function public.upsert_workout_with_sets(
  p_scheduled jsonb,
  p_workout jsonb,
  p_sets jsonb
) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  sw_row public.scheduled_workouts;
  wl_row public.workout_logs;
  sl_rows jsonb;
  incoming_updated timestamptz;
begin
  -- 2a. Upsert scheduled_workout (optional)
  if p_scheduled is not null and p_scheduled ? 'id' then
    incoming_updated := coalesce((p_scheduled->>'updated_at')::timestamptz, now());

    insert into public.scheduled_workouts as sw
      (id, program_id, day_id, client_id, scheduled_date, status, completed_at, updated_at)
    values (
      (p_scheduled->>'id')::uuid,
      nullif(p_scheduled->>'program_id','')::uuid,
      nullif(p_scheduled->>'day_id','')::uuid,
      (p_scheduled->>'client_id')::uuid,
      (p_scheduled->>'scheduled_date')::date,
      coalesce(p_scheduled->>'status', 'pending'),
      nullif(p_scheduled->>'completed_at','')::timestamptz,
      incoming_updated
    )
    on conflict (id) do update
      set status       = case when excluded.updated_at >= sw.updated_at then excluded.status       else sw.status       end,
          completed_at = case when excluded.updated_at >= sw.updated_at then excluded.completed_at else sw.completed_at end,
          updated_at   = greatest(sw.updated_at, excluded.updated_at)
    returning * into sw_row;
  end if;

  -- 2b. Upsert workout_log (parent of sets)
  if p_workout is not null and p_workout ? 'id' then
    incoming_updated := coalesce((p_workout->>'updated_at')::timestamptz, now());

    insert into public.workout_logs as wl
      (id, scheduled_workout_id, client_id, logged_at, updated_at)
    values (
      (p_workout->>'id')::uuid,
      nullif(p_workout->>'scheduled_workout_id','')::uuid,
      (p_workout->>'client_id')::uuid,
      coalesce((p_workout->>'logged_at')::timestamptz, now()),
      incoming_updated
    )
    on conflict (id) do update
      set logged_at  = case when excluded.updated_at >= wl.updated_at then excluded.logged_at else wl.logged_at end,
          updated_at = greatest(wl.updated_at, excluded.updated_at)
    returning * into wl_row;
  end if;

  -- 2c. Upsert each set_log; skip rows whose parent doesn't exist (FK would fail).
  if p_sets is not null and jsonb_typeof(p_sets) = 'array' then
    with incoming as (
      select
        (s->>'id')::uuid                                  as id,
        (s->>'workout_log_id')::uuid                      as workout_log_id,
        nullif(s->>'program_exercise_id','')::uuid        as program_exercise_id,
        (s->>'exercise_id')::uuid                         as exercise_id,
        nullif(s->>'set_number','')::int                  as set_number,
        nullif(s->>'weight','')::numeric                  as weight,
        nullif(s->>'reps','')::int                        as reps,
        nullif(s->>'rpe','')::numeric                     as rpe,
        coalesce((s->>'updated_at')::timestamptz, now())  as updated_at
      from jsonb_array_elements(p_sets) s
    ),
    valid as (
      select i.* from incoming i
      where exists (select 1 from public.workout_logs wl where wl.id = i.workout_log_id)
    ),
    upserted as (
      insert into public.set_logs as sl
        (id, workout_log_id, program_exercise_id, exercise_id, set_number, weight, reps, rpe, updated_at)
      select id, workout_log_id, program_exercise_id, exercise_id, set_number, weight, reps, rpe, updated_at
      from valid
      on conflict (id) do update
        set weight      = case when excluded.updated_at >= sl.updated_at then excluded.weight     else sl.weight     end,
            reps        = case when excluded.updated_at >= sl.updated_at then excluded.reps       else sl.reps       end,
            rpe         = case when excluded.updated_at >= sl.updated_at then excluded.rpe        else sl.rpe        end,
            set_number  = case when excluded.updated_at >= sl.updated_at then excluded.set_number else sl.set_number end,
            updated_at  = greatest(sl.updated_at, excluded.updated_at)
      returning sl.*
    )
    select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb) into sl_rows from upserted u;
  else
    sl_rows := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'scheduled_workout', case when sw_row.id is not null then to_jsonb(sw_row) else null end,
    'workout_log',       case when wl_row.id is not null then to_jsonb(wl_row) else null end,
    'set_logs',          coalesce(sl_rows, '[]'::jsonb)
  );
end $$;

grant execute on function public.upsert_workout_with_sets(jsonb, jsonb, jsonb) to authenticated;

-- =====================================================================
-- Fix offline sync RPC: clients have no INSERT policy on scheduled_workouts
-- (only coaches do). The previous RPC used INSERT ... ON CONFLICT DO UPDATE
-- which Postgres checks against the INSERT WITH CHECK clause even when the
-- row exists, so client uploads of completed status were rejected by RLS.
--
-- Fix: branch in PL/pgSQL — UPDATE existing scheduled_workouts only.
-- A client never legitimately creates a scheduled_workouts row.
-- =====================================================================

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
  exists_sw boolean;
begin
  -- 2a. Update scheduled_workout (UPDATE only — clients can't INSERT)
  if p_scheduled is not null and p_scheduled ? 'id' then
    incoming_updated := coalesce((p_scheduled->>'updated_at')::timestamptz, now());

    select exists (
      select 1 from public.scheduled_workouts where id = (p_scheduled->>'id')::uuid
    ) into exists_sw;

    if exists_sw then
      update public.scheduled_workouts as sw
      set status       = case when incoming_updated >= sw.updated_at then coalesce(p_scheduled->>'status', sw.status) else sw.status end,
          completed_at = case when incoming_updated >= sw.updated_at then nullif(p_scheduled->>'completed_at','')::timestamptz else sw.completed_at end,
          updated_at   = greatest(sw.updated_at, incoming_updated)
      where sw.id = (p_scheduled->>'id')::uuid
      returning * into sw_row;
    end if;
  end if;

  -- 2b. Upsert workout_log (client has INSERT policy)
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

  -- 2c. Upsert set_logs (client has FOR ALL policy via parent)
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

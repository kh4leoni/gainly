-- =====================================================================
-- RPC functions for complex aggregates (single-roundtrip reads)
-- =====================================================================

-- Coach dashboard: one row per client with today's status + unread + last PR.
create or replace function public.coach_dashboard(_coach uuid default auth.uid())
returns table (
  client_id uuid,
  full_name text,
  avatar_url text,
  today_status text,
  today_workout_id uuid,
  unread_count bigint,
  last_pr_at timestamptz
) language sql stable security invoker set search_path = public as $$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    sw.status,
    sw.id,
    coalesce(m.unread, 0),
    pr.last_pr_at
  from public.coach_clients cc
  join public.profiles p on p.id = cc.client_id
  left join lateral (
    select sw.id, sw.status from public.scheduled_workouts sw
    where sw.client_id = cc.client_id and sw.scheduled_date = current_date
    order by sw.scheduled_date desc limit 1
  ) sw on true
  left join lateral (
    select count(*) as unread from public.messages msg
    join public.threads t on t.id = msg.thread_id
    where t.coach_id = _coach and t.client_id = cc.client_id
      and msg.sender_id = cc.client_id
      and msg.read_at is null
  ) m on true
  left join lateral (
    select max(achieved_at) as last_pr_at from public.personal_records
    where client_id = cc.client_id
  ) pr on true
  where cc.coach_id = _coach and cc.status = 'active';
$$;

-- 1RM progression for one client/exercise (used by progress chart).
create or replace function public.one_rm_curve(_client uuid, _exercise uuid, _days int default 180)
returns table (day date, best_1rm numeric) language sql stable security invoker set search_path = public as $$
  select date_trunc('day', wl.logged_at)::date as day,
         max(sl.estimated_1rm) as best_1rm
  from public.set_logs sl
  join public.workout_logs wl on wl.id = sl.workout_log_id
  where wl.client_id = _client
    and sl.exercise_id = _exercise
    and wl.logged_at >= now() - make_interval(days => _days)
  group by 1
  order by 1;
$$;

-- Generate scheduled_workouts from a program for a client starting on _start_date.
create or replace function public.schedule_program(_program uuid, _client uuid, _start_date date)
returns int language plpgsql security invoker set search_path = public as $$
declare
  _inserted int := 0;
  _coach uuid;
begin
  select coach_id into _coach from public.programs where id = _program;
  if _coach is null or _coach != auth.uid() then
    raise exception 'not authorized to schedule this program';
  end if;

  insert into public.scheduled_workouts (program_id, day_id, client_id, scheduled_date)
  select _program,
         d.id,
         _client,
         _start_date + ((w.week_number - 1) * 7 + (d.day_number - 1)) * interval '1 day'
  from public.program_weeks w
  join public.program_days d on d.week_id = w.id
  where w.program_id = _program;

  get diagnostics _inserted = row_count;
  return _inserted;
end $$;

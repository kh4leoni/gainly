-- Cardio personal records: per (client, exercise, canonical-distance bucket).
--
-- Buckets:
--   cooper  — 12 min run (720 s ± 30 s). Best = max distance_m.
--   1km     — distance_m ∈ [950, 1050]. Best = min duration_s.
--   5km     — distance_m ∈ [4900, 5100]. Best = min duration_s.
--   10km    — distance_m ∈ [9850, 10150]. Best = min duration_s.
--   21km    — distance_m ∈ [20800, 21400] (half marathon ~21.0975 km).
--   42km    — distance_m ∈ [41700, 42700] (marathon ~42.195 km).
--
-- A set_log can match at most one bucket. Overshoot ("ran 6 km, would have hit
-- 5 k PR mid-run") is NOT detected — only logged exact distances within
-- tolerance count, since we have no split data.

create table public.cardio_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  bucket text not null check (bucket in ('cooper','1km','5km','10km','21km','42km')),
  duration_s int,
  distance_m numeric,
  set_log_id uuid references public.set_logs(id) on delete set null,
  achieved_at timestamptz not null default now(),
  unique (client_id, exercise_id, bucket)
);
create index on public.cardio_records (client_id, achieved_at desc);

alter table public.cardio_records enable row level security;

create policy "read cardio_records" on public.cardio_records
  for select using (
    client_id = auth.uid() or public.is_coach_of(client_id)
  );

-- ── Bucket detection -----------------------------------------------------
-- Returns NULL if the set doesn't fall into any bucket.
create or replace function public.cardio_bucket_for(
  p_distance_m numeric, p_duration_s int
) returns text
language plpgsql immutable as $$
begin
  -- Cooper test: 12 min ± 30 s, distance recorded.
  if p_duration_s is not null
     and p_duration_s between 690 and 750
     and p_distance_m is not null then
    return 'cooper';
  end if;

  -- Distance buckets require both distance and duration.
  if p_distance_m is null or p_duration_s is null then
    return null;
  end if;

  if p_distance_m between 950   and 1050   then return '1km';  end if;
  if p_distance_m between 4900  and 5100   then return '5km';  end if;
  if p_distance_m between 9850  and 10150  then return '10km'; end if;
  if p_distance_m between 20800 and 21400  then return '21km'; end if;
  if p_distance_m between 41700 and 42700  then return '42km'; end if;
  return null;
end $$;

-- ── Recompute one (client, exercise, bucket) row from scratch ----------
create or replace function public.recompute_cardio_bucket(
  p_client uuid, p_exercise uuid, p_bucket text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  has_rows boolean;
begin
  if p_bucket is null then return; end if;

  select exists (
    select 1
    from public.set_logs sl
    join public.workout_logs wl on wl.id = sl.workout_log_id
    where wl.client_id = p_client
      and sl.exercise_id = p_exercise
      and public.cardio_bucket_for(sl.distance_m, sl.duration_s) = p_bucket
  ) into has_rows;

  if not has_rows then
    delete from public.cardio_records
    where client_id = p_client and exercise_id = p_exercise and bucket = p_bucket;
    return;
  end if;

  if p_bucket = 'cooper' then
    -- Best = max distance_m.
    with best as (
      select sl.id, sl.distance_m, sl.duration_s, wl.logged_at
      from public.set_logs sl
      join public.workout_logs wl on wl.id = sl.workout_log_id
      where wl.client_id = p_client
        and sl.exercise_id = p_exercise
        and public.cardio_bucket_for(sl.distance_m, sl.duration_s) = 'cooper'
      order by sl.distance_m desc nulls last, wl.logged_at desc
      limit 1
    )
    insert into public.cardio_records
      (client_id, exercise_id, bucket, duration_s, distance_m, set_log_id, achieved_at)
    select p_client, p_exercise, 'cooper', b.duration_s, b.distance_m, b.id, b.logged_at
    from best b
    on conflict (client_id, exercise_id, bucket) do update
      set duration_s = excluded.duration_s,
          distance_m = excluded.distance_m,
          set_log_id = excluded.set_log_id,
          achieved_at = excluded.achieved_at;
  else
    -- Best = min duration_s for the bucket.
    with best as (
      select sl.id, sl.distance_m, sl.duration_s, wl.logged_at
      from public.set_logs sl
      join public.workout_logs wl on wl.id = sl.workout_log_id
      where wl.client_id = p_client
        and sl.exercise_id = p_exercise
        and public.cardio_bucket_for(sl.distance_m, sl.duration_s) = p_bucket
      order by sl.duration_s asc nulls last, wl.logged_at desc
      limit 1
    )
    insert into public.cardio_records
      (client_id, exercise_id, bucket, duration_s, distance_m, set_log_id, achieved_at)
    select p_client, p_exercise, p_bucket, b.duration_s, b.distance_m, b.id, b.logged_at
    from best b
    on conflict (client_id, exercise_id, bucket) do update
      set duration_s = excluded.duration_s,
          distance_m = excluded.distance_m,
          set_log_id = excluded.set_log_id,
          achieved_at = excluded.achieved_at;
  end if;
end $$;

-- ── Trigger on set_logs changes ----------------------------------------
create or replace function public.on_set_log_change_cardio() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _client uuid;
  _new_bucket text;
  _old_bucket text;
begin
  select client_id into _client
  from public.workout_logs
  where id = coalesce(
    case when TG_OP = 'DELETE' then OLD.workout_log_id else NEW.workout_log_id end,
    case when TG_OP = 'DELETE' then NULL else NEW.workout_log_id end
  );
  if _client is null then return coalesce(NEW, OLD); end if;

  if TG_OP in ('INSERT','UPDATE') then
    _new_bucket := public.cardio_bucket_for(NEW.distance_m, NEW.duration_s);
  end if;
  if TG_OP in ('UPDATE','DELETE') then
    _old_bucket := public.cardio_bucket_for(OLD.distance_m, OLD.duration_s);
  end if;

  if _new_bucket is not null and NEW.exercise_id is not null then
    perform public.recompute_cardio_bucket(_client, NEW.exercise_id, _new_bucket);
  end if;
  if _old_bucket is not null
     and OLD.exercise_id is not null
     and (TG_OP = 'DELETE' or _old_bucket is distinct from _new_bucket or OLD.exercise_id <> NEW.exercise_id) then
    perform public.recompute_cardio_bucket(_client, OLD.exercise_id, _old_bucket);
  end if;

  return coalesce(NEW, OLD);
end $$;

create trigger set_logs_change_cardio_trg
  after insert or update or delete on public.set_logs
  for each row execute function public.on_set_log_change_cardio();

-- ── Backfill: scan existing set_logs --------------------------------
do $$
declare
  r record;
begin
  for r in
    select distinct wl.client_id, sl.exercise_id,
           public.cardio_bucket_for(sl.distance_m, sl.duration_s) as bucket
    from public.set_logs sl
    join public.workout_logs wl on wl.id = sl.workout_log_id
    where public.cardio_bucket_for(sl.distance_m, sl.duration_s) is not null
  loop
    perform public.recompute_cardio_bucket(r.client_id, r.exercise_id, r.bucket);
  end loop;
end $$;

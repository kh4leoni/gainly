-- =====================================================================
-- Application-level rate limit primitive + the few triggers / RPCs we
-- need today. Storing buckets in Postgres avoids spinning up an Upstash
-- / Redis dependency just for "stop one bad client per minute".
--
-- Bucket strategy: round `now()` down to the start of an N-second
-- window, insert a row keyed by (key, window_start). Conflict bumps the
-- count by 1. A row whose post-increment count exceeds the limit
-- triggers a violation. Old rows expire via a periodic cleanup (cron
-- isn't strictly needed; rows are tiny and self-prune as keys roll).
-- =====================================================================

create table if not exists public.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        int         not null default 1,
  primary key (key, window_start)
);

-- SECURITY DEFINER so triggers can write regardless of the caller's
-- table-level grants. The function itself never trusts user input
-- for the key — callers must build the key with auth.uid().
create or replace function public.rl_hit(_key text, _max int, _window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
  v_count int;
begin
  insert into public.rate_limits (key, window_start, count)
  values (_key, v_start, 1)
  on conflict (key, window_start) do update
    set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= _max;
end $$;

revoke execute on function public.rl_hit(text, int, int) from public, anon, authenticated;
-- intentionally NOT granted to authenticated — only invoked via SECURITY
-- DEFINER triggers / RPCs that compose a trusted key from auth.uid().

-- Periodic cleanup of expired bucket rows. Called opportunistically
-- inside the trigger functions (1% probability per call).
create or replace function public.rl_gc()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.rate_limits
  where window_start < now() - interval '1 day';
end $$;
revoke execute on function public.rl_gc() from public, anon, authenticated;

-- ── Trigger: cap messages per sender per minute ─────────────────────
-- 30 messages / minute / sender is comfortable for human chat but
-- blocks bots / accidental loops.
create or replace function public.enforce_messages_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if random() < 0.01 then perform public.rl_gc(); end if;
  v_ok := public.rl_hit('msg:' || NEW.sender_id::text, 30, 60);
  if not v_ok then
    raise exception 'Rate limit exceeded: max 30 messages per minute' using errcode = 'P0001';
  end if;
  return NEW;
end $$;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.enforce_messages_rate();

-- ── Trigger: cap bodyweights inserts per client per day ──────────────
-- 20 weigh-ins / day is generous (typical: 1). Stops storage abuse.
create or replace function public.enforce_bodyweights_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  v_ok := public.rl_hit('bw:' || NEW.client_id::text, 20, 86400);
  if not v_ok then
    raise exception 'Rate limit exceeded: max 20 bodyweight entries per day' using errcode = 'P0001';
  end if;
  return NEW;
end $$;

drop trigger if exists bodyweights_rate_limit on public.bodyweights;
create trigger bodyweights_rate_limit
  before insert on public.bodyweights
  for each row execute function public.enforce_bodyweights_rate();

-- ── Trigger: cap waist measurements per client per day ──────────────
create or replace function public.enforce_waist_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  v_ok := public.rl_hit('waist:' || NEW.client_id::text, 20, 86400);
  if not v_ok then
    raise exception 'Rate limit exceeded: max 20 waist entries per day' using errcode = 'P0001';
  end if;
  return NEW;
end $$;

drop trigger if exists waist_rate_limit on public.waist_measurements;
create trigger waist_rate_limit
  before insert on public.waist_measurements
  for each row execute function public.enforce_waist_rate();

-- ── Trigger: cap push subscriptions per user ────────────────────────
-- Each user-agent install creates exactly one endpoint. A user with
-- more than 10 distinct devices is suspect (probably abuse trying to
-- bloat the subscribers table for push-bombing).
create or replace function public.enforce_push_subs_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.push_subscriptions where user_id = NEW.user_id;
  if v_count >= 10 then
    raise exception 'Rate limit exceeded: max 10 push subscriptions per user' using errcode = 'P0001';
  end if;
  return NEW;
end $$;

drop trigger if exists push_subscriptions_rate_limit on public.push_subscriptions;
create trigger push_subscriptions_rate_limit
  before insert on public.push_subscriptions
  for each row execute function public.enforce_push_subs_rate();

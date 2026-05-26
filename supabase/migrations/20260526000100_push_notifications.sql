-- =====================================================================
-- Web Push notifications for messages.
--
-- Stores per-device subscriptions and triggers the `send-push` edge
-- function after each message insert. Recipient resolution and VAPID
-- signing live in the edge function (service_role).
--
-- Requires two database settings (set once per environment):
--   alter database postgres set app.supabase_url       = 'https://<ref>.supabase.co';
--   alter database postgres set app.push_function_secret = '<shared secret with edge fn>';
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- Per-device subscription. `endpoint` is globally unique across users
-- (a subscription belongs to exactly one user-agent install).
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "own subs read"   on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "own subs insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "own subs update" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own subs delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Per-user preference. Default on; user opts out from settings.
alter table public.profiles
  add column if not exists push_messages boolean not null default true;

-- AFTER INSERT trigger on messages → call send-push edge function.
-- Body carries only the message_id; the edge function does the lookup
-- with service_role (recipient profile, push_messages flag, subs).
create or replace function public.notify_message_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url    text := current_setting('app.supabase_url', true);
  v_secret text := current_setting('app.push_function_secret', true);
begin
  if v_url is null or v_secret is null then
    return NEW;  -- not configured yet; skip silently
  end if;

  perform net.http_post(
    url     := v_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-push-secret',   v_secret
    ),
    body    := jsonb_build_object('message_id', NEW.id)
  );
  return NEW;
end $$;

drop trigger if exists messages_notify_push on public.messages;
create trigger messages_notify_push
  after insert on public.messages
  for each row execute function public.notify_message_push();

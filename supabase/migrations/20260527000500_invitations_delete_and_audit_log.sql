-- =====================================================================
-- L6 — let coaches DELETE their own invitations.
-- The original RLS only had SELECT + INSERT. Coaches had no way to
-- revoke a pending invitation; this fills that gap.
--
-- M3 — append-only audit log for security-relevant events.
-- We can't trust client logging for forensics. Triggers on the most
-- sensitive tables write to `audit_log` via a SECDEF function so the
-- caller never needs direct write access. RLS lets the actor read
-- their own entries; service_role sees everything.
-- =====================================================================

-- L6 ──────────────────────────────────────────────────────────────────
create policy "coach deletes own invitations" on public.invitations
  for delete using (coach_id = auth.uid());


-- M3 ──────────────────────────────────────────────────────────────────
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id    uuid,                       -- nullable: system-driven events
  event       text not null,              -- e.g. 'profile.password_change'
  target_id   uuid,                       -- subject of the event (often = actor)
  metadata    jsonb not null default '{}'::jsonb
);

create index audit_log_actor_time on public.audit_log (actor_id, occurred_at desc);
create index audit_log_event_time on public.audit_log (event, occurred_at desc);

alter table public.audit_log enable row level security;

-- Users see only their own entries (own actions + things done to them).
create policy "actor reads own" on public.audit_log
  for select using (actor_id = auth.uid() or target_id = auth.uid());

-- No INSERT / UPDATE / DELETE policy — the table is append-only via
-- the SECDEF helper below, and read-modify is denied to everyone but
-- service_role (which bypasses RLS).

create or replace function public.audit_write(
  _event text,
  _target uuid default null,
  _metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, event, target_id, metadata)
  values (auth.uid(), _event, coalesce(_target, auth.uid()), coalesce(_metadata, '{}'::jsonb));
end $$;

revoke execute on function public.audit_write(text, uuid, jsonb) from public, anon;
grant   execute on function public.audit_write(text, uuid, jsonb) to authenticated;

-- ── Trigger: profile role-change ATTEMPTS (already blocked by
--     protect_profile_role, but we log the attempt for forensics).
create or replace function public.audit_profile_role_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, event, target_id, metadata)
    values (
      auth.uid(),
      'profile.role_change',
      new.id,
      jsonb_build_object('from', old.role, 'to', new.role)
    );
  end if;
  return new;
end $$;

drop trigger if exists audit_profile_role on public.profiles;
create trigger audit_profile_role
  before update on public.profiles
  for each row execute function public.audit_profile_role_attempt();

-- ── Trigger: invitations accepted (track who accepted what + when).
create or replace function public.audit_invitation_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    insert into public.audit_log (actor_id, event, target_id, metadata)
    values (
      auth.uid(),
      'invitation.accepted',
      new.coach_id,
      jsonb_build_object('invitation_id', new.id, 'email', new.email)
    );
  end if;
  return new;
end $$;

drop trigger if exists audit_invitation_accept on public.invitations;
create trigger audit_invitation_accept
  after update on public.invitations
  for each row execute function public.audit_invitation_accept();

-- ── Trigger: coach_clients status change (deactivation = forensic event).
create or replace function public.audit_coach_clients_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (actor_id, event, target_id, metadata)
    values (
      auth.uid(),
      'coach_client.status_change',
      new.client_id,
      jsonb_build_object('coach_id', new.coach_id, 'from', old.status, 'to', new.status)
    );
  end if;
  return new;
end $$;

drop trigger if exists audit_coach_clients_status on public.coach_clients;
create trigger audit_coach_clients_status
  after update on public.coach_clients
  for each row execute function public.audit_coach_clients_status();

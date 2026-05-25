-- =====================================================================
-- Security hardening: invite flow + coach_clients write protection
--
-- BEFORE this migration:
--   - "coach manages own relations" policy let any authenticated user
--     insert (coach_id = self, client_id = any uuid) and instantly read
--     that victim's data via is_coach_of(). Critical RLS bypass.
--   - inviteClient (server action) used the same path: when the invitee
--     email already existed in auth.users it auto-linked without consent.
--
-- AFTER this migration:
--   - coach_clients has NO insert policy. Only accept_invitation
--     (SECURITY DEFINER) creates rows.
--   - Coach can update status (e.g. flip to 'inactive') but cannot
--     change coach_id / client_id (trigger guard).
--   - Coach can delete rows they own.
--   - accept_invitation now: (a) verifies the invitee's auth.users.email
--     matches the invitation, (b) inactivates the invitee's other active
--     coach relationships (exclusive coaching), (c) inserts the new row.
--   - New helper RPC my_pending_invitations() returns the caller's
--     pending invites for the dashboard banner.
-- =====================================================================

-- 1. Drop the overly-permissive "for all" policy on coach_clients ------
drop policy if exists "coach manages own relations" on public.coach_clients;

-- 2. Replace with narrow update + delete policies (no insert) ---------
create policy "coach updates own relations" on public.coach_clients
  for update using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

create policy "coach deletes own relations" on public.coach_clients
  for delete using (auth.uid() = coach_id);

-- 3. Trigger: forbid coach_id / client_id changes via UPDATE ----------
-- Without this, a coach could UPDATE their existing row to point at a
-- different client_id and gain access via is_coach_of(new_client).
create or replace function public.protect_coach_clients_keys()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.coach_id is distinct from old.coach_id
     or new.client_id is distinct from old.client_id then
    raise exception 'coach_id and client_id are immutable on coach_clients';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_coach_clients_keys on public.coach_clients;
create trigger protect_coach_clients_keys
  before update on public.coach_clients
  for each row execute function public.protect_coach_clients_keys();

-- 4. accept_invitation: verify email + enforce exclusive coaching -----
create or replace function public.accept_invitation(_token uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  _inv record;
  _caller_email text;
begin
  -- Caller's auth.users email (function runs as definer; we still scope to auth.uid()).
  select email into _caller_email from auth.users where id = auth.uid();
  if _caller_email is null then
    raise exception 'not authenticated';
  end if;

  select * into _inv from public.invitations
  where token = _token and status = 'pending';
  if not found then
    raise exception 'invalid or expired invitation';
  end if;

  -- The invitee must be the same person the invitation was addressed to.
  if lower(_inv.email) <> lower(_caller_email) then
    raise exception 'this invitation was issued to a different email';
  end if;

  -- Exclusive coaching: deactivate any other active relationship for this client.
  update public.coach_clients
     set status = 'inactive'
   where client_id = auth.uid()
     and status = 'active'
     and coach_id <> _inv.coach_id;

  -- Insert / reactivate the new relationship.
  insert into public.coach_clients (coach_id, client_id, status)
  values (_inv.coach_id, auth.uid(), 'active')
  on conflict (coach_id, client_id) do update set status = 'active';

  update public.invitations
     set status = 'accepted', accepted_at = now()
   where id = _inv.id;
end;
$$;

grant execute on function public.accept_invitation(uuid) to authenticated;

-- 5. Helper: dashboard banner reads pending invites for current user -
-- RLS on invitations only lets the coach SELECT. SECURITY DEFINER scopes
-- the lookup to the caller's email so we don't have to broaden the RLS.
create or replace function public.my_pending_invitations()
returns table (
  id uuid,
  coach_id uuid,
  coach_name text,
  token uuid,
  created_at timestamptz
) language sql security definer set search_path = public, auth stable as $$
  select i.id, i.coach_id, p.full_name, i.token, i.created_at
  from public.invitations i
  join auth.users u on lower(u.email) = lower(i.email)
  join public.profiles p on p.id = i.coach_id
  where u.id = auth.uid() and i.status = 'pending'
  order by i.created_at desc;
$$;

grant execute on function public.my_pending_invitations() to authenticated;

-- 6. Helper: server-side lookup of whether an email is already a user.
-- Replaces the listUsers({ perPage: 1000 }) loop in inviteClient.
-- SECURITY DEFINER + service-role-only grant so the value cannot be
-- abused for email enumeration by regular clients.
create or replace function public.email_user_exists(_email text)
returns boolean language sql security definer set search_path = public, auth stable as $$
  select exists (select 1 from auth.users where lower(email) = lower(_email));
$$;

revoke execute on function public.email_user_exists(text) from public, anon, authenticated;
grant execute on function public.email_user_exists(text) to service_role;

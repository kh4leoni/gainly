-- Invitations table
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  invited_name text,
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (coach_id, email),
  unique (token)
);
create index on public.invitations (token);
alter table public.invitations enable row level security;
create policy "coach reads own invitations" on public.invitations
  for select using (coach_id = auth.uid());
create policy "coach inserts own invitations" on public.invitations
  for insert with check (coach_id = auth.uid());

-- accept_invitation RPC (security definer so client can insert coach_clients)
create or replace function public.accept_invitation(_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _inv record;
begin
  select * into _inv from public.invitations
  where token = _token and status = 'pending';
  if _inv is null then
    raise exception 'invalid or expired invitation';
  end if;
  insert into public.coach_clients (coach_id, client_id, status)
  values (_inv.coach_id, auth.uid(), 'active')
  on conflict (coach_id, client_id) do update set status = 'active';
  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = _inv.id;
end $$;

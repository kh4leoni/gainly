create table public.bodyweights (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric(5,1) not null check (weight_kg > 0 and weight_kg < 500),
  logged_at timestamptz not null default now()
);

create index bodyweights_client_logged on public.bodyweights(client_id, logged_at desc);

alter table public.bodyweights enable row level security;

create policy "select own or coach" on public.bodyweights
  for select using (auth.uid() = client_id or is_coach_of(client_id));

create policy "client insert own" on public.bodyweights
  for insert with check (auth.uid() = client_id);

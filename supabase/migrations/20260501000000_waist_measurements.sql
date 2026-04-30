create table public.waist_measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  waist_cm numeric(5,1) not null check (waist_cm > 0 and waist_cm < 300),
  logged_at timestamptz not null default now()
);

create index waist_measurements_client_logged on public.waist_measurements(client_id, logged_at desc);

alter table public.waist_measurements enable row level security;

create policy "select own or coach" on public.waist_measurements
  for select using (auth.uid() = client_id or is_coach_of(client_id));

create policy "client insert own" on public.waist_measurements
  for insert with check (auth.uid() = client_id);

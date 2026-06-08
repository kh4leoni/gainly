-- Client's own persistent per-exercise note. Unlike workout_exercise_notes
-- (scoped to a single workout_log instance), this is keyed by exercise so it
-- surfaces every time the client trains that movement — a sticky reminder
-- like "kyynärpäät lähellä" that the athlete keeps for themselves.
create table public.client_exercise_notes (
  client_id   uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  notes       text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (client_id, exercise_id)
);

alter table public.client_exercise_notes enable row level security;

create policy "client rw own" on public.client_exercise_notes
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "coach reads clients" on public.client_exercise_notes
  for select using (public.is_coach_of(client_id));

-- Client notes on a training day (stored on workout_logs)
alter table public.workout_logs add column if not exists notes text;

-- Client notes per exercise within a workout
create table public.workout_exercise_notes (
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises(id) on delete cascade,
  notes text not null default '',
  primary key (workout_log_id, program_exercise_id)
);

alter table public.workout_exercise_notes enable row level security;

create policy "client rw own" on public.workout_exercise_notes
  for all using (
    exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and wl.client_id = auth.uid())
  )
  with check (
    exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and wl.client_id = auth.uid())
  );

create policy "coach reads clients" on public.workout_exercise_notes
  for select using (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = workout_log_id and public.is_coach_of(wl.client_id)
    )
  );

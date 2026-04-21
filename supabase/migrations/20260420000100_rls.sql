-- =====================================================================
-- Row-Level Security
-- =====================================================================

alter table public.profiles          enable row level security;
alter table public.coach_clients     enable row level security;
alter table public.exercises         enable row level security;
alter table public.programs          enable row level security;
alter table public.program_weeks     enable row level security;
alter table public.program_days      enable row level security;
alter table public.program_exercises enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.workout_logs      enable row level security;
alter table public.set_logs          enable row level security;
alter table public.personal_records  enable row level security;
alter table public.threads           enable row level security;
alter table public.messages          enable row level security;

-- helper: is_coach_of(client)
create or replace function public.is_coach_of(_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_clients
    where coach_id = auth.uid() and client_id = _client and status = 'active'
  );
$$;

-- helper: is_client_of(coach)
create or replace function public.is_client_of(_coach uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_clients
    where coach_id = _coach and client_id = auth.uid() and status = 'active'
  );
$$;

-- -------------------- profiles --------------------
create policy "own profile read" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_coach_of(id)
    or public.is_client_of(id)
  );
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- -------------------- coach_clients --------------------
create policy "participants read" on public.coach_clients
  for select using (auth.uid() in (coach_id, client_id));
create policy "coach manages own relations" on public.coach_clients
  for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- -------------------- exercises --------------------
create policy "read global or own or coach's clients" on public.exercises
  for select using (
    created_by is null
    or created_by = auth.uid()
    or public.is_client_of(created_by)   -- client can read coach's library
  );
create policy "coach writes own" on public.exercises
  for insert with check (auth.uid() = created_by);
create policy "coach updates own" on public.exercises
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "coach deletes own" on public.exercises
  for delete using (auth.uid() = created_by);

-- -------------------- programs --------------------
create policy "coach reads own" on public.programs
  for select using (
    coach_id = auth.uid()
    or client_id = auth.uid()
  );
create policy "coach writes own" on public.programs
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- -------------------- program_weeks / days / exercises --------------------
-- helper: caller can access program
create or replace function public.can_access_program(_program uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programs p
    where p.id = _program
      and (p.coach_id = auth.uid() or p.client_id = auth.uid())
  );
$$;

create or replace function public.can_modify_program(_program uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programs p
    where p.id = _program and p.coach_id = auth.uid()
  );
$$;

create policy "read program_weeks" on public.program_weeks
  for select using (public.can_access_program(program_id));
create policy "write program_weeks" on public.program_weeks
  for all using (public.can_modify_program(program_id))
  with check (public.can_modify_program(program_id));

create policy "read program_days" on public.program_days
  for select using (
    exists (select 1 from public.program_weeks w
            where w.id = week_id and public.can_access_program(w.program_id))
  );
create policy "write program_days" on public.program_days
  for all using (
    exists (select 1 from public.program_weeks w
            where w.id = week_id and public.can_modify_program(w.program_id))
  )
  with check (
    exists (select 1 from public.program_weeks w
            where w.id = week_id and public.can_modify_program(w.program_id))
  );

create policy "read program_exercises" on public.program_exercises
  for select using (
    exists (
      select 1 from public.program_days d
      join public.program_weeks w on w.id = d.week_id
      where d.id = day_id and public.can_access_program(w.program_id)
    )
  );
create policy "write program_exercises" on public.program_exercises
  for all using (
    exists (
      select 1 from public.program_days d
      join public.program_weeks w on w.id = d.week_id
      where d.id = day_id and public.can_modify_program(w.program_id)
    )
  )
  with check (
    exists (
      select 1 from public.program_days d
      join public.program_weeks w on w.id = d.week_id
      where d.id = day_id and public.can_modify_program(w.program_id)
    )
  );

-- -------------------- scheduled_workouts --------------------
create policy "client and coach read" on public.scheduled_workouts
  for select using (
    client_id = auth.uid() or public.is_coach_of(client_id)
  );
create policy "coach writes" on public.scheduled_workouts
  for all using (public.is_coach_of(client_id))
  with check (public.is_coach_of(client_id));
create policy "client updates own status" on public.scheduled_workouts
  for update using (client_id = auth.uid()) with check (client_id = auth.uid());

-- -------------------- workout_logs --------------------
create policy "client and coach read" on public.workout_logs
  for select using (
    client_id = auth.uid() or public.is_coach_of(client_id)
  );
create policy "client writes own" on public.workout_logs
  for insert with check (client_id = auth.uid());
create policy "client updates own" on public.workout_logs
  for update using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "client deletes own" on public.workout_logs
  for delete using (client_id = auth.uid());

-- -------------------- set_logs --------------------
create policy "read set_logs" on public.set_logs
  for select using (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = workout_log_id
        and (wl.client_id = auth.uid() or public.is_coach_of(wl.client_id))
    )
  );
create policy "write set_logs" on public.set_logs
  for all using (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = workout_log_id and wl.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = workout_log_id and wl.client_id = auth.uid()
    )
  );

-- -------------------- personal_records --------------------
create policy "read own or coach's clients" on public.personal_records
  for select using (
    client_id = auth.uid() or public.is_coach_of(client_id)
  );
-- writes happen only through trigger (security definer), so no write policy needed.

-- -------------------- threads / messages --------------------
create policy "participants read threads" on public.threads
  for select using (auth.uid() in (coach_id, client_id));
create policy "participants create threads" on public.threads
  for insert with check (auth.uid() in (coach_id, client_id));

create policy "participants read messages" on public.messages
  for select using (
    exists (select 1 from public.threads t
            where t.id = thread_id and auth.uid() in (t.coach_id, t.client_id))
  );
create policy "sender writes messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (select 1 from public.threads t
                where t.id = thread_id and auth.uid() in (t.coach_id, t.client_id))
  );
create policy "recipient marks read" on public.messages
  for update using (
    exists (select 1 from public.threads t
            where t.id = thread_id and auth.uid() in (t.coach_id, t.client_id))
  )
  with check (
    exists (select 1 from public.threads t
            where t.id = thread_id and auth.uid() in (t.coach_id, t.client_id))
  );

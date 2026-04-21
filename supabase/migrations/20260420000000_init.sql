-- =====================================================================
-- Gainly initial schema
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('coach','client')),
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Keep role in the JWT so middleware can route without a DB read.
-- Hook triggered on sign-in by Supabase Auth "custom_access_token_hook".
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  claims jsonb := event->'claims';
  user_role text;
begin
  select role into user_role from public.profiles where id = (event->>'user_id')::uuid;
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  end if;
  return jsonb_set(event, '{claims}', claims);
end $$;

-- Grants required when the hook is enabled via Auth → Hooks in Studio.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;

-- ---------------------------------------------------------------------
-- coach ↔ client relationship
-- ---------------------------------------------------------------------
create table public.coach_clients (
  coach_id  uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status    text not null default 'active' check (status in ('active','inactive','pending')),
  created_at timestamptz not null default now(),
  primary key (coach_id, client_id)
);
create index on public.coach_clients (client_id);

-- ---------------------------------------------------------------------
-- exercises (global if created_by is null, otherwise coach-owned)
-- ---------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  instructions text,
  video_path text,
  muscle_groups text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.exercises using gin (muscle_groups);
create index on public.exercises (name);
create index on public.exercises (created_by);

-- ---------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id  uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  is_template boolean generated always as (client_id is null) stored,
  created_at timestamptz not null default now()
);
create index on public.programs (coach_id, client_id);

create table public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  week_number int not null,
  unique (program_id, week_number)
);

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.program_weeks(id) on delete cascade,
  day_number int not null,
  name text,
  unique (week_id, day_number)
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_days(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  order_idx int not null,
  sets int,
  reps text,
  intensity numeric,
  intensity_type text check (intensity_type in ('percent_1rm','rpe','kg','bw')),
  rest_sec int,
  notes text
);
create index on public.program_exercises (day_id, order_idx);

-- ---------------------------------------------------------------------
-- scheduled workouts
-- ---------------------------------------------------------------------
create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete set null,
  day_id uuid references public.program_days(id) on delete set null,
  client_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'pending' check (status in ('pending','completed','skipped')),
  completed_at timestamptz
);
create index on public.scheduled_workouts (client_id, scheduled_date);

-- ---------------------------------------------------------------------
-- workout logs
-- ---------------------------------------------------------------------
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  scheduled_workout_id uuid references public.scheduled_workouts(id) on delete set null,
  client_id uuid not null references public.profiles(id) on delete cascade,
  logged_at timestamptz not null default now()
);
create index on public.workout_logs (client_id, logged_at desc);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  program_exercise_id uuid references public.program_exercises(id) on delete set null,
  exercise_id uuid not null references public.exercises(id),
  set_number int,
  weight numeric,
  reps int,
  rpe numeric,
  is_pr boolean not null default false,
  estimated_1rm numeric generated always as (
    case when weight is null or reps is null or reps = 0
      then null
      else weight * (1 + reps::numeric / 30.0)
    end
  ) stored
);
create index on public.set_logs (exercise_id, estimated_1rm desc);
create index on public.set_logs (workout_log_id);

-- ---------------------------------------------------------------------
-- personal records (materialized for fast reads)
-- ---------------------------------------------------------------------
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  rep_range text not null,
  weight numeric,
  reps int,
  estimated_1rm numeric,
  set_log_id uuid references public.set_logs(id) on delete set null,
  achieved_at timestamptz not null default now(),
  unique (client_id, exercise_id, rep_range)
);
create index on public.personal_records (client_id, achieved_at desc);

-- ---------------------------------------------------------------------
-- messaging
-- ---------------------------------------------------------------------
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  coach_id  uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  unique (coach_id, client_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on public.messages (thread_id, created_at desc);

-- bump thread last_message_at
create or replace function public.touch_thread() returns trigger language plpgsql as $$
begin
  update public.threads set last_message_at = NEW.created_at where id = NEW.thread_id;
  return NEW;
end $$;
create trigger messages_touch_thread after insert on public.messages
for each row execute function public.touch_thread();

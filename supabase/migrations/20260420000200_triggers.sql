-- =====================================================================
-- Triggers: PR detection, profile bootstrapping
-- =====================================================================

-- Auto-create profile row on signup. Role is read from raw_user_meta_data.role.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- PR detection.
-- IMPORTANT: stored generated columns (estimated_1rm) are computed AFTER BEFORE triggers,
-- so we split the work: BEFORE trigger sets NEW.is_pr based on inline math,
-- AFTER trigger writes personal_records using the generated value.
create or replace function public.before_set_log_pr() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rep_range_label text;
  existing numeric;
  _client_id uuid;
  _est numeric;
begin
  if NEW.reps is null or NEW.weight is null or NEW.reps = 0 then
    return NEW;
  end if;

  rep_range_label := case
    when NEW.reps = 1             then '1RM'
    when NEW.reps between 2 and 3 then '3RM'
    when NEW.reps between 4 and 5 then '5RM'
    else null
  end;
  if rep_range_label is null then return NEW; end if;

  _est := NEW.weight * (1 + NEW.reps::numeric / 30.0);

  select client_id into _client_id from public.workout_logs where id = NEW.workout_log_id;

  select estimated_1rm into existing
  from public.personal_records
  where client_id = _client_id
    and exercise_id = NEW.exercise_id
    and rep_range = rep_range_label;

  if existing is null or _est > existing then
    NEW.is_pr := true;
  end if;

  return NEW;
end $$;

create or replace function public.after_set_log_pr() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rep_range_label text;
  _client_id uuid;
begin
  if not NEW.is_pr then return NEW; end if;

  rep_range_label := case
    when NEW.reps = 1             then '1RM'
    when NEW.reps between 2 and 3 then '3RM'
    when NEW.reps between 4 and 5 then '5RM'
    else null
  end;
  if rep_range_label is null then return NEW; end if;

  select client_id into _client_id from public.workout_logs where id = NEW.workout_log_id;

  insert into public.personal_records
    (client_id, exercise_id, rep_range, weight, reps, estimated_1rm, set_log_id)
  values
    (_client_id, NEW.exercise_id, rep_range_label, NEW.weight, NEW.reps, NEW.estimated_1rm, NEW.id)
  on conflict (client_id, exercise_id, rep_range) do update
    set weight        = excluded.weight,
        reps          = excluded.reps,
        estimated_1rm = excluded.estimated_1rm,
        set_log_id    = excluded.set_log_id,
        achieved_at   = now();
  return NEW;
end $$;

drop trigger if exists set_logs_pr on public.set_logs;
drop trigger if exists set_logs_pr_before on public.set_logs;
drop trigger if exists set_logs_pr_after  on public.set_logs;

create trigger set_logs_pr_before
  before insert on public.set_logs
  for each row execute function public.before_set_log_pr();

create trigger set_logs_pr_after
  after insert on public.set_logs
  for each row execute function public.after_set_log_pr();

-- Realtime: broadcast personal_records inserts and message inserts.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.personal_records;
alter publication supabase_realtime add table public.set_logs;

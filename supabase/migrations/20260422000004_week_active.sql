alter table public.program_weeks
  add column if not exists is_active boolean not null default false;

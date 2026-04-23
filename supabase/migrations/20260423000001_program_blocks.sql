-- Program blocks (jaksot) — a named period/phase containing multiple weeks
create table public.program_blocks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  block_number int not null,
  name text,
  description text
);

alter table public.program_blocks enable row level security;

create policy "read program_blocks" on public.program_blocks
  for select using (public.can_access_program(program_id));

create policy "write program_blocks" on public.program_blocks
  for all using (public.can_modify_program(program_id))
  with check (public.can_modify_program(program_id));

-- Weeks now belong to a block within a program (block_id is the primary grouping;
-- program_id is kept for RLS convenience)
alter table public.program_weeks
  add column if not exists block_id uuid references public.program_blocks(id) on delete cascade;

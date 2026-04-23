-- Week numbers are now scoped per block, not per program
alter table public.program_weeks
  drop constraint if exists program_weeks_program_id_week_number_key;

alter table public.program_weeks
  add constraint program_weeks_block_id_week_number_key unique (block_id, week_number);

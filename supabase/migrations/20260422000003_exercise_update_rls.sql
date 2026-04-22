-- Allow coaches to update any exercise (global or their own).
-- Global exercises (created_by IS NULL) were previously uneditable due to
-- the "coach updates own" policy requiring auth.uid() = created_by.
drop policy if exists "coach updates own" on public.exercises;
create policy "coach updates" on public.exercises
  for update
  using  (auth.uid() = created_by or created_by is null)
  with check (auth.uid() = created_by or created_by is null);

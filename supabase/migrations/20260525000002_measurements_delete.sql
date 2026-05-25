-- =====================================================================
-- Allow clients to delete their own bodyweight + waist measurements.
-- (Insert policies already exist; only SELECT is shared with the coach.)
-- =====================================================================

create policy "client deletes own"
  on public.bodyweights
  for delete
  using (auth.uid() = client_id);

create policy "client deletes own"
  on public.waist_measurements
  for delete
  using (auth.uid() = client_id);

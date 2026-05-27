-- =====================================================================
-- Tighten the `participants create threads` INSERT policy.
--
-- The old policy let any authenticated user insert a thread row that
-- merely listed them as either coach_id or client_id — no requirement
-- that the (coach, client) pair actually have an active coaching
-- relationship. Worst case: a coach with one client could insert a
-- thread targeting any other user_id and that user would see a phantom
-- empty thread in their list (spam vector). New constraint requires an
-- `active` row in coach_clients matching the pair.
-- =====================================================================

drop policy if exists "participants create threads" on public.threads;

create policy "participants create threads" on public.threads
  for insert with check (
    auth.uid() in (coach_id, client_id)
    and exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = threads.coach_id
        and cc.client_id = threads.client_id
        and cc.status = 'active'
    )
  );

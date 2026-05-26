-- =====================================================================
-- Clean up duplicate exercise rows.
--
-- Background: a re-seed run on 2026-05-25 14:13 inserted a second set
-- of `created_by IS NULL` template rows with random UUIDs alongside
-- the original fixed-UUID templates from migration 20260422000002.
-- The `fn_copy_template_exercises_for_new_coach` trigger then copied
-- *both* sets into every coach created after 2026-05-25 (currently
-- only Fanni Savela), leaving 38 same-named pairs in her bank.
-- Renaming one copy in the UI left the other visible as if the rename
-- hadn't taken effect — that's the bug the user reported.
--
-- This migration:
--   1) For each (coach, name) group of per-coach exercises with >1
--      rows, picks the oldest row as the keeper, remaps every
--      reference (program_exercises, set_logs, personal_records) to
--      the keeper, then deletes the losers.
--   2) Deletes the random-UUID template duplicates so future coaches
--      only inherit the original 41 templates. Templates aren't
--      referenced directly anywhere (the per-coach migration already
--      remapped every reference to a coach copy), so a plain delete
--      is sufficient.
-- =====================================================================

-- Step 1: dedupe per-coach copies
create temporary table _dup_exercise_map as
with ranked as (
  select
    id,
    created_by,
    name,
    row_number() over (
      partition by created_by, name
      order by created_at asc, id asc
    ) as rn
  from public.exercises
  where created_by is not null
)
select
  loser.id  as loser_id,
  winner.id as keeper_id
from ranked loser
join ranked winner
  on loser.created_by = winner.created_by
 and loser.name       = winner.name
 and winner.rn = 1
where loser.rn > 1;

update public.program_exercises pe
set exercise_id = m.keeper_id
from _dup_exercise_map m
where pe.exercise_id = m.loser_id;

update public.set_logs sl
set exercise_id = m.keeper_id
from _dup_exercise_map m
where sl.exercise_id = m.loser_id;

update public.personal_records pr
set exercise_id = m.keeper_id
from _dup_exercise_map m
where pr.exercise_id = m.loser_id;

delete from public.exercises
where id in (select loser_id from _dup_exercise_map);

drop table _dup_exercise_map;

-- Step 2: dedupe template rows
-- Keep only the original fixed-UUID templates (00000000-…); delete
-- any other null-`created_by` row whose name still has a fixed-UUID
-- twin. The personal_records / set_logs / program_exercises tables
-- never reference template IDs (the per-coach migration remapped
-- everything), so we can drop them outright.
delete from public.exercises e1
where e1.created_by is null
  and e1.id::text not like '00000000-0000-0000-0000-%'
  and exists (
    select 1 from public.exercises e2
    where e2.created_by is null
      and e2.name = e1.name
      and e2.id <> e1.id
      and e2.id::text like '00000000-0000-0000-0000-%'
  );

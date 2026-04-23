-- =====================================================================
-- Per-set target RPE on program_exercises
-- =====================================================================
-- target_rpes: jsonb array of nullable numerics, one per set.
-- e.g. [null, 7, 7.5]  (null = <6 for that set)
-- When null (column), fall back to the single target_rpe value for all sets.

alter table public.program_exercises
  add column target_rpes jsonb;

-- =====================================================================
-- Per-set configs on program_exercises
-- =====================================================================
-- set_configs: jsonb array of {reps, weight, rpe} objects, one per set.
-- When present, this is the authoritative source for per-set data.
-- Falls back to the existing sets/reps/intensity/target_rpe columns.
--
-- Example: [{"reps":"6","weight":100,"rpe":7},{"reps":"6","weight":100,"rpe":7.5}]

alter table public.program_exercises
  add column set_configs jsonb;

-- Cardio + free-text exercise support.
--
-- exercises.kind: 'lifting' (default, backward compatible) | 'cardio' | 'free'
--   - lifting: existing flow (reps/weight/RPE per set)
--   - cardio:  per-set fields chosen via tracks_* flags below
--   - free:    coach writes a description, client toggles done — no sets
--
-- tracks_* booleans control which inputs the workout logger renders for cardio
-- (and which target fields the coach-side editor exposes).

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'lifting'
    CHECK (kind IN ('lifting', 'cardio', 'free')),
  ADD COLUMN IF NOT EXISTS tracks_weight   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tracks_reps     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tracks_distance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracks_duration boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracks_hr       boolean NOT NULL DEFAULT false;

-- Per-set cardio outputs.
ALTER TABLE public.set_logs
  ADD COLUMN IF NOT EXISTS distance_m numeric,
  ADD COLUMN IF NOT EXISTS duration_s integer,
  ADD COLUMN IF NOT EXISTS avg_hr     integer;

-- Coach-side targets for cardio + free description.
ALTER TABLE public.program_exercises
  ADD COLUMN IF NOT EXISTS target_distance_m numeric,
  ADD COLUMN IF NOT EXISTS target_duration_s integer,
  ADD COLUMN IF NOT EXISTS target_hr_bpm     integer,
  ADD COLUMN IF NOT EXISTS free_text         text;

-- PR system is reps/weight-based today. Skip cardio rows so the trigger doesn't
-- recompute meaningless buckets when distance_m / duration_s are set.
-- (recompute_pr_bucket already early-returns when reps is null or out of 1..5,
-- and cardio sets typically have null reps — so no migration change needed,
-- but document the assumption.)
COMMENT ON COLUMN public.set_logs.distance_m IS 'Cardio: per-set distance in meters. PR system ignores rows where reps is null.';
COMMENT ON COLUMN public.set_logs.duration_s IS 'Cardio: per-set duration in seconds.';
COMMENT ON COLUMN public.set_logs.avg_hr     IS 'Cardio: per-set average heart rate in bpm.';
COMMENT ON COLUMN public.exercises.kind      IS 'lifting | cardio | free — determines which inputs the logger renders.';

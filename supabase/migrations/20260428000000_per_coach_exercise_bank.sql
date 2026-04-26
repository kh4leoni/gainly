-- Per-coach exercise bank isolation.
-- Global exercises (created_by IS NULL) become invisible to regular users;
-- they remain as templates that get copied to each coach on registration.
-- Existing coaches receive copies now; all FK references are remapped.

-- -------------------------------------------------------------------------
-- Step 1: Build mapping of global exercise → per-coach copy
-- -------------------------------------------------------------------------
CREATE TEMP TABLE _ex_map AS
SELECT
  e.id          AS old_id,
  gen_random_uuid() AS new_id,
  p.id          AS coach_id
FROM public.exercises e
CROSS JOIN public.profiles p
WHERE e.created_by IS NULL
  AND p.role = 'coach';

-- -------------------------------------------------------------------------
-- Step 2: Insert per-coach copies
-- -------------------------------------------------------------------------
INSERT INTO public.exercises (id, created_by, name, instructions, video_path, muscle_groups, created_at)
SELECT m.new_id, m.coach_id, e.name, e.instructions, e.video_path, e.muscle_groups, e.created_at
FROM _ex_map m
JOIN public.exercises e ON e.id = m.old_id;

-- -------------------------------------------------------------------------
-- Step 3: Remap program_exercises → per-coach copies
-- -------------------------------------------------------------------------
UPDATE public.program_exercises pe
SET exercise_id = m.new_id
FROM public.program_days pd
JOIN public.program_weeks pw ON pd.week_id = pw.id
JOIN public.programs prog ON pw.program_id = prog.id
JOIN _ex_map m ON m.coach_id = prog.coach_id
WHERE pe.day_id = pd.id
  AND pe.exercise_id = m.old_id;

-- -------------------------------------------------------------------------
-- Step 4: Remap set_logs → per-coach copies
-- (go through workout_logs → coach_clients; pick first coach per client)
-- -------------------------------------------------------------------------
UPDATE public.set_logs sl
SET exercise_id = m.new_id
FROM public.workout_logs wl
JOIN (
  SELECT DISTINCT ON (client_id) client_id, coach_id
  FROM public.coach_clients
  ORDER BY client_id, created_at
) cc ON cc.client_id = wl.client_id
JOIN _ex_map m ON m.coach_id = cc.coach_id
WHERE sl.workout_log_id = wl.id
  AND sl.exercise_id = m.old_id;

-- -------------------------------------------------------------------------
-- Step 5: Remap personal_records → per-coach copies
-- -------------------------------------------------------------------------
UPDATE public.personal_records pr
SET exercise_id = m.new_id
FROM (
  SELECT DISTINCT ON (client_id) client_id, coach_id
  FROM public.coach_clients
  ORDER BY client_id, created_at
) cc
JOIN _ex_map m ON m.coach_id = cc.coach_id
WHERE pr.client_id = cc.client_id
  AND pr.exercise_id = m.old_id;

-- -------------------------------------------------------------------------
-- Step 6: Fix RLS — remove global exercise visibility
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "read global or own or coach's clients" ON public.exercises;
CREATE POLICY "read own or coach's" ON public.exercises
  FOR SELECT USING (
    created_by = auth.uid()
    OR public.is_client_of(created_by)
  );

-- Remove NULL allowance from UPDATE policy (introduced in 20260422000003)
DROP POLICY IF EXISTS "coach updates" ON public.exercises;
CREATE POLICY "coach updates" ON public.exercises
  FOR UPDATE
  USING  (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- -------------------------------------------------------------------------
-- Step 7: Trigger — copy templates to new coaches on profile creation/role change
-- SECURITY DEFINER bypasses RLS so it can read created_by IS NULL templates.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_copy_template_exercises_for_new_coach()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'coach' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'coach') THEN
    INSERT INTO exercises (id, created_by, name, instructions, video_path, muscle_groups, created_at)
    SELECT gen_random_uuid(), NEW.id, name, instructions, video_path, muscle_groups, now()
    FROM exercises
    WHERE created_by IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_copy_exercises_for_new_coach
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_copy_template_exercises_for_new_coach();

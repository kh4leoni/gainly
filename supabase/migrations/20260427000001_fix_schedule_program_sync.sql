-- Fix schedule_program to preserve completed workout status.
-- Old version deleted all scheduled_workouts on every save, wiping status/completed_at.
-- New version: only removes rows for days deleted from program,
-- only inserts rows for newly added days. Existing rows untouched.

CREATE OR REPLACE FUNCTION public.schedule_program(_program uuid, _client uuid)
RETURNS int LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  _inserted int := 0;
  _coach uuid;
BEGIN
  SELECT coach_id INTO _coach FROM public.programs WHERE id = _program;
  IF _coach IS NULL OR _coach != auth.uid() THEN
    RAISE EXCEPTION 'not authorized to schedule this program';
  END IF;

  -- Remove scheduled_workouts for days that were deleted from the program
  DELETE FROM public.scheduled_workouts sw
  WHERE sw.program_id = _program
    AND sw.client_id = _client
    AND NOT EXISTS (
      SELECT 1
      FROM public.program_days d
      JOIN public.program_weeks w ON d.week_id = w.id
      WHERE w.program_id = _program AND d.id = sw.day_id
    );

  -- Insert only new days that don't have a scheduled_workout yet
  INSERT INTO public.scheduled_workouts (program_id, day_id, client_id)
  SELECT _program, d.id, _client
  FROM public.program_weeks w
  JOIN public.program_days d ON d.week_id = w.id
  WHERE w.program_id = _program
    AND NOT EXISTS (
      SELECT 1 FROM public.scheduled_workouts sw2
      WHERE sw2.day_id = d.id AND sw2.client_id = _client
    );

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted;
END $$;

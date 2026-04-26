-- Remove date-based scheduling: workouts are navigated by active week, not calendar dates.

ALTER TABLE public.scheduled_workouts
  ALTER COLUMN scheduled_date DROP NOT NULL,
  ALTER COLUMN scheduled_date SET DEFAULT NULL;

DROP INDEX IF EXISTS scheduled_workouts_client_id_scheduled_date_idx;
CREATE INDEX IF NOT EXISTS scheduled_workouts_client_id_idx
  ON public.scheduled_workouts (client_id);

-- Remove _start_date parameter; insert NULL for scheduled_date
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

  DELETE FROM public.scheduled_workouts
    WHERE program_id = _program AND client_id = _client;

  INSERT INTO public.scheduled_workouts (program_id, day_id, client_id)
  SELECT _program, d.id, _client
  FROM public.program_weeks w
  JOIN public.program_days d ON d.week_id = w.id
  WHERE w.program_id = _program;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted;
END $$;

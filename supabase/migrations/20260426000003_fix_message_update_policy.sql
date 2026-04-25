-- Fix: message update policy allowed any thread participant to modify any column,
-- including the content of messages they did not send. Replace with a trigger that
-- enforces read_at-only updates by the recipient.

DROP POLICY IF EXISTS "recipient marks read" ON public.messages;

CREATE OR REPLACE FUNCTION public.messages_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.content    IS DISTINCT FROM OLD.content    OR
    NEW.sender_id  IS DISTINCT FROM OLD.sender_id  OR
    NEW.thread_id  IS DISTINCT FROM OLD.thread_id  OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Only read_at may be updated on messages';
  END IF;

  IF auth.uid() = OLD.sender_id THEN
    RAISE EXCEPTION 'Sender cannot mark their own message as read';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_update_guard_trigger
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.messages_update_guard();

CREATE POLICY "recipient marks read" ON public.messages
  FOR UPDATE
  USING (
    sender_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_id AND auth.uid() IN (t.coach_id, t.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_id AND auth.uid() IN (t.coach_id, t.client_id)
    )
  );

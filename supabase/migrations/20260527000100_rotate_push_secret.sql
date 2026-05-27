-- Rotate the PUSH_FUNCTION_SECRET embedded in `notify_message_push`.
-- The previous value (f369ed…) leaked through migration history and
-- conversation transcripts; this rotation invalidates it.
--
-- Coordination: the matching `supabase secrets set PUSH_FUNCTION_SECRET`
-- must already be live on the edge function before this migration is
-- pushed, otherwise the trigger will start posting a header the edge
-- function rejects with 401. Local order:
--   1. supabase secrets set PUSH_FUNCTION_SECRET=<new>  ← done
--   2. apply this migration                              ← here

create or replace function public.notify_message_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://xvhbwyxihcrugeditchm.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-push-secret', '7a40fbd9497615eb5cf188ce995056fb2a973c535e4a43470fbee6d81d56ca38'
    ),
    body    := jsonb_build_object('message_id', NEW.id)
  );
  return NEW;
end $$;

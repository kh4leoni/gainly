-- Rewire `notify_message_push` to inline the edge-function URL and the
-- shared secret instead of reading them from `current_setting()`. The
-- original migration assumed we could `ALTER DATABASE postgres SET …`
-- to persist the values, but on Supabase hosted projects the migration
-- runs without superuser, so the ALTER fails with permission denied.
--
-- Both values are tied to this Supabase project; keeping them in the
-- migration is acceptable for this private repo. Rotate the secret
-- (and `PUSH_FUNCTION_SECRET` in edge function env) together if the
-- repo is ever shared.

create or replace function public.notify_message_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://xvhbwyxihcrugeditchm.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-push-secret', 'f369ed84dd303616f246f66322d6428639566729e285b4f6e0aed1e745bd145a'
    ),
    body    := jsonb_build_object('message_id', NEW.id)
  );
  return NEW;
end $$;

-- =====================================================================
-- Hard length caps on every free-form text column.
--
-- All these used `text` (unbounded). Without a cap a single authenticated
-- user can persist tens of MB per row — memory pressure on the DB,
-- bloat in backups, slow queries. Not a direct exploit but a clear
-- DoS surface. Limits picked to match realistic usage with headroom.
--
-- Server-side action layer also validates with Zod (see lib/schemas);
-- these CHECK constraints are the last-resort floor.
-- =====================================================================

-- profiles
alter table public.profiles
  add constraint profiles_full_name_len     check (full_name     is null or length(full_name)     <= 200),
  add constraint profiles_email_len         check (email         is null or length(email)         <= 320),
  add constraint profiles_phone_len         check (phone         is null or length(phone)         <= 50),
  add constraint profiles_avatar_url_len    check (avatar_url    is null or length(avatar_url)    <= 1000),
  add constraint profiles_co_brand_label_len check (co_brand_label is null or length(co_brand_label) <= 100);

-- exercises
alter table public.exercises
  add constraint exercises_name_len         check (length(name) <= 200),
  add constraint exercises_instructions_len check (instructions is null or length(instructions) <= 5000),
  add constraint exercises_video_path_len   check (video_path is null or length(video_path) <= 1000);

-- programs
alter table public.programs
  add constraint programs_title_len       check (length(title) <= 200),
  add constraint programs_description_len check (description is null or length(description) <= 5000);

-- program_weeks
alter table public.program_weeks
  add constraint program_weeks_name_len        check (name is null or length(name) <= 200),
  add constraint program_weeks_description_len check (description is null or length(description) <= 2000);

-- program_days
alter table public.program_days
  add constraint program_days_name_len        check (name is null or length(name) <= 200),
  add constraint program_days_description_len check (description is null or length(description) <= 2000);

-- program_blocks (created in a later migration but follows same shape)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'program_blocks') then
    execute 'alter table public.program_blocks add constraint program_blocks_name_len check (name is null or length(name) <= 200)';
    execute 'alter table public.program_blocks add constraint program_blocks_description_len check (description is null or length(description) <= 2000)';
  end if;
end $$;

-- program_exercises
alter table public.program_exercises
  add constraint program_exercises_notes_len    check (notes is null or length(notes) <= 2000),
  add constraint program_exercises_reps_len     check (reps is null or length(reps) <= 50),
  add constraint program_exercises_intensity_type_len check (intensity_type is null or length(intensity_type) <= 20),
  add constraint program_exercises_free_text_len check (free_text is null or length(free_text) <= 5000);

-- messages
alter table public.messages
  add constraint messages_content_len check (length(content) > 0 and length(content) <= 5000);

-- invitations
alter table public.invitations
  add constraint invitations_email_len        check (length(email) <= 320),
  add constraint invitations_invited_name_len check (invited_name is null or length(invited_name) <= 200);

-- push_subscriptions
alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_len  check (length(endpoint) <= 2000),
  add constraint push_subscriptions_p256dh_len    check (length(p256dh) <= 200),
  add constraint push_subscriptions_auth_len      check (length(auth) <= 200),
  add constraint push_subscriptions_user_agent_len check (user_agent is null or length(user_agent) <= 500);

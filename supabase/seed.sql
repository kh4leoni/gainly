-- =====================================================================
-- Seed data for local development
-- Creates a coach + 2 clients, global exercises, and a sample program.
-- Passwords are 'password' for all users.
-- =====================================================================

-- NOTE: The auth users below must be inserted via supabase.auth.admin in a
-- separate script (seed users via SQL is not portable across auth versions).
-- Use `supabase/scripts/seed-users.ts` which runs after migrations.

-- Global exercise library
insert into public.exercises (id, created_by, name, instructions, muscle_groups) values
  ('00000000-0000-0000-0000-000000000001', null, 'Back Squat',  'Bar on upper traps, depth below parallel.', array['quads','glutes','hamstrings']),
  ('00000000-0000-0000-0000-000000000002', null, 'Bench Press', 'Touch chest, pause, press.',                 array['chest','triceps','shoulders']),
  ('00000000-0000-0000-0000-000000000003', null, 'Deadlift',    'Hinge pattern, neutral spine.',              array['hamstrings','glutes','back']),
  ('00000000-0000-0000-0000-000000000004', null, 'Overhead Press','Full lockout overhead.',                   array['shoulders','triceps']),
  ('00000000-0000-0000-0000-000000000005', null, 'Pull-Up',     'Chin over bar, controlled descent.',         array['back','biceps'])
on conflict (id) do nothing;

-- =====================================================================
-- Seed data for local development
-- Creates a coach + 2 clients, global exercises, and a sample program.
-- Passwords are 'password' for all users.
-- =====================================================================

-- NOTE: The auth users below must be inserted via supabase.auth.admin in a
-- separate script (seed users via SQL is not portable across auth versions).
-- Use `supabase/scripts/seed-users.ts` which runs after migrations.

-- Global exercise library is seeded by migration 20260618000000_replace_exercise_bank.sql
-- (templates with 10000000-… UUIDs). On `db:reset` migrations run before this file,
-- so the templates already exist; seed-users.ts then triggers per-coach copies.

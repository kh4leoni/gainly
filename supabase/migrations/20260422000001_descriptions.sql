-- Add coach-authored description fields to weeks and workouts.
-- program_exercises.notes already exists and serves as the exercise-level instruction.
ALTER TABLE program_weeks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE program_days  ADD COLUMN IF NOT EXISTS description text;

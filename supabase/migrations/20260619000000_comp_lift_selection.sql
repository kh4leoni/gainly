-- Big-three competition lift selection.
-- Replaces name-string matching (matchBigThree) with an explicit per-lift
-- exercise pick. The coach picks on the client's coach_clients row; the client
-- picks on their own profile. The two are independent and never affect each other.
-- on delete set null: if the chosen exercise is removed, the pick clears.

alter table public.profiles
  add column comp_squat_exercise_id uuid references public.exercises(id) on delete set null,
  add column comp_bench_exercise_id uuid references public.exercises(id) on delete set null,
  add column comp_dead_exercise_id  uuid references public.exercises(id) on delete set null;

alter table public.coach_clients
  add column comp_squat_exercise_id uuid references public.exercises(id) on delete set null,
  add column comp_bench_exercise_id uuid references public.exercises(id) on delete set null,
  add column comp_dead_exercise_id  uuid references public.exercises(id) on delete set null;

-- RLS already covers both writes: profiles "own profile update" (client edits
-- own row) and coach_clients "coach manages own relations" (coach edits). No new
-- policies needed.

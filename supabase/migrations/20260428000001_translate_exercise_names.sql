-- Translate English exercise names to Finnish.
-- Updates both template rows (created_by IS NULL) and all per-coach copies.

UPDATE public.exercises SET name = 'Takakyykky',     instructions = 'Tanko yläselälle, syvyys alle vaakatasoon.'
  WHERE name = 'Back Squat';
UPDATE public.exercises SET name = 'Penkkipunnerrus', instructions = 'Kosketa rintaa, pidä hetki, punnerra.'
  WHERE name = 'Bench Press';
UPDATE public.exercises SET name = 'Maastaveto',     instructions = 'Lantiosaranaliike, neutraali selkäranka.'
  WHERE name = 'Deadlift';
UPDATE public.exercises SET name = 'Pystypunnerrus', instructions = 'Täysi ojennus ylhäällä.'
  WHERE name = 'Overhead Press';
UPDATE public.exercises SET name = 'Leuanveto',      instructions = 'Leuka tangon yli, kontrolloitu lasku.'
  WHERE name = 'Pull-Up';
UPDATE public.exercises SET name = 'Kasvoveto'
  WHERE name = 'Face pull';
UPDATE public.exercises SET name = 'Lonkkaojennus'
  WHERE name = 'Hip thrust';

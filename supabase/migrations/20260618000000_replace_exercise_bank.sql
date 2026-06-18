-- =====================================================================
-- Replace the global exercise template bank with a curated 100-lift set.
--
-- Layering (see 20260428000000_per_coach_exercise_bank):
--   * templates  (created_by IS NULL)        — invisible, copied to coaches
--   * per-coach copies (created_by = coach)   — what programs/logs reference
--
-- Steps:
--   1. Insert the new 100 templates (10000000-… UUIDs).
--   2. Capture the OLD template names (every created_by IS NULL row that is
--      not one of the new 100) — this is the junk to purge.
--   3. Delete coaches' copies whose NAME is an old template name AND that are
--      unreferenced everywhere (programmed / logged / PR / cardio / notes).
--      Referenced copies stay; removing them would destroy client data.
--      A coach's own custom lifts (names not on the old template list) are
--      never touched.
--   4. Give the 100 to existing coaches (skipping names they already have —
--      the on-registration trigger only backfills future coaches).
--   5. Delete the old templates outright (never referenced by design).
-- =====================================================================

-- 1. New templates -----------------------------------------------------
insert into public.exercises (id, created_by, name, muscle_groups) values
  ('10000000-0000-0000-0000-000000000001', null, 'Takakyykky',                          array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000002', null, 'Etukyykky',                           array['quads','glutes']),
  ('10000000-0000-0000-0000-000000000003', null, 'Paussikyykky',                        array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000004', null, 'Box-kyykky',                          array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000005', null, 'Zercher-kyykky',                      array['quads','glutes','core']),
  ('10000000-0000-0000-0000-000000000006', null, 'Askelkyykky',                         array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000007', null, 'Bulgarialainen askelkyykky',          array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000008', null, 'Hack-kyykky',                         array['quads','glutes']),
  ('10000000-0000-0000-0000-000000000009', null, 'Jalkaprässi',                         array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000010', null, 'Reiden ojennus',                      array['quads']),
  ('10000000-0000-0000-0000-000000000011', null, 'Reiden koukistus istuen',             array['hamstrings']),
  ('10000000-0000-0000-0000-000000000012', null, 'Reiden koukistus maaten',             array['hamstrings']),
  ('10000000-0000-0000-0000-000000000013', null, 'Romanialainen maastaveto',            array['hamstrings','glutes','back']),
  ('10000000-0000-0000-0000-000000000014', null, 'Suorin jaloin maastaveto',            array['hamstrings','glutes','back']),
  ('10000000-0000-0000-0000-000000000015', null, 'Maastaveto kapealla',                 array['hamstrings','glutes','back','quads']),
  ('10000000-0000-0000-0000-000000000016', null, 'Sumoveto',                            array['glutes','hamstrings','quads','back']),
  ('10000000-0000-0000-0000-000000000017', null, 'Pukkiveto',                           array['back','traps','hamstrings','glutes']),
  ('10000000-0000-0000-0000-000000000018', null, 'Korokeveto',                          array['hamstrings','glutes','back','quads']),
  ('10000000-0000-0000-0000-000000000019', null, 'SJMV käsipainoilla',                  array['hamstrings','glutes']),
  ('10000000-0000-0000-0000-000000000020', null, 'Maastaveto käsipainoilla',            array['hamstrings','glutes','back','quads']),
  ('10000000-0000-0000-0000-000000000021', null, 'Lantionnosto (Hip thrust)',           array['glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000022', null, 'Pohjenousu seisten',                  array['calves']),
  ('10000000-0000-0000-0000-000000000023', null, 'Pohjenousu istuen',                   array['calves']),
  ('10000000-0000-0000-0000-000000000024', null, 'Askelkyykky kävellen',                array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000025', null, 'Sivuttaisaskelkyykky',                array['quads','glutes','adductors']),
  ('10000000-0000-0000-0000-000000000026', null, 'Yhden jalan kyykky',                  array['quads','glutes']),
  ('10000000-0000-0000-0000-000000000027', null, 'Askelkyykky käsipainoilla',           array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000028', null, 'Kyykky käsipainolla (Goblet squat)',  array['quads','glutes']),
  ('10000000-0000-0000-0000-000000000029', null, 'Askelkyykky taljassa',                array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000030', null, 'Askelkyykky hypyllä',                 array['quads','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000031', null, 'Penkkipunnerrus',                     array['chest','triceps','shoulders']),
  ('10000000-0000-0000-0000-000000000032', null, 'Paussipenkki',                        array['chest','triceps','shoulders']),
  ('10000000-0000-0000-0000-000000000033', null, 'Kapea penkkipunnerrus',               array['triceps','chest']),
  ('10000000-0000-0000-0000-000000000034', null, 'Vinopenkki tangolla',                 array['chest','shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000035', null, 'Vinopenkki käsipainoilla',            array['chest','shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000036', null, 'Tasapenkki käsipainoilla',            array['chest','triceps','shoulders']),
  ('10000000-0000-0000-0000-000000000037', null, 'Ristikkäistalja',                     array['chest']),
  ('10000000-0000-0000-0000-000000000038', null, 'Rintaprässi koneessa',                array['chest','triceps','shoulders']),
  ('10000000-0000-0000-0000-000000000039', null, 'Vipuvarsipunnerrus',                  array['chest','triceps']),
  ('10000000-0000-0000-0000-000000000040', null, 'Flyes käsipainoilla',                 array['chest']),
  ('10000000-0000-0000-0000-000000000041', null, 'Flyes taljassa',                      array['chest']),
  ('10000000-0000-0000-0000-000000000042', null, 'Punnerrus',                           array['chest','triceps','shoulders']),
  ('10000000-0000-0000-0000-000000000043', null, 'Vinopunnerrus käsipainoilla',         array['chest','shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000044', null, 'Alaviistopenkki tangolla',            array['chest','triceps']),
  ('10000000-0000-0000-0000-000000000045', null, 'Alaviistopenkki käsipainoilla',       array['chest','triceps']),
  ('10000000-0000-0000-0000-000000000046', null, 'Pullover käsipainolla',               array['chest','back']),
  ('10000000-0000-0000-0000-000000000047', null, 'Pullover taljassa',                   array['chest','back']),
  ('10000000-0000-0000-0000-000000000048', null, 'Rintaprässi istuen',                  array['chest','triceps','shoulders']),
  ('10000000-0000-0000-0000-000000000049', null, 'Leuanveto',                           array['back','biceps']),
  ('10000000-0000-0000-0000-000000000050', null, 'Ylätalja',                            array['back','biceps']),
  ('10000000-0000-0000-0000-000000000051', null, 'Kulmasoutu tangolla',                 array['back','biceps']),
  ('10000000-0000-0000-0000-000000000052', null, 'Kulmasoutu käsipainolla',             array['back','biceps']),
  ('10000000-0000-0000-0000-000000000053', null, 'Alasoutu taljassa',                   array['back','biceps']),
  ('10000000-0000-0000-0000-000000000054', null, 'Face pull',                           array['shoulders','back']),
  ('10000000-0000-0000-0000-000000000055', null, 'Ylätalja kapealla otteella',          array['back','biceps']),
  ('10000000-0000-0000-0000-000000000056', null, 'Kulmasoutu koneessa',                 array['back','biceps']),
  ('10000000-0000-0000-0000-000000000057', null, 'T-tankosoutu',                        array['back','biceps']),
  ('10000000-0000-0000-0000-000000000058', null, 'Vipuvarsisoutu',                      array['back','biceps']),
  ('10000000-0000-0000-0000-000000000059', null, 'Leuanveto vastaotteella',             array['back','biceps']),
  ('10000000-0000-0000-0000-000000000060', null, 'Leuanveto myötäotteella',             array['back','biceps']),
  ('10000000-0000-0000-0000-000000000061', null, 'Selänojennus',                        array['back','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000062', null, 'Hyvää huomenta -liike (Good morning)',array['hamstrings','glutes','back']),
  ('10000000-0000-0000-0000-000000000063', null, 'Ylätalja leveällä otteella',          array['back','biceps']),
  ('10000000-0000-0000-0000-000000000064', null, 'Pystysoutu tangolla',                 array['shoulders','traps','biceps']),
  ('10000000-0000-0000-0000-000000000065', null, 'Pystysoutu käsipainoilla',            array['shoulders','traps','biceps']),
  ('10000000-0000-0000-0000-000000000066', null, 'Shrugs (kohautukset)',                array['traps']),
  ('10000000-0000-0000-0000-000000000067', null, 'Kulmasoutu smith-laitteessa',         array['back','biceps']),
  ('10000000-0000-0000-0000-000000000068', null, 'Selänojennus laitteessa',             array['back','glutes','hamstrings']),
  ('10000000-0000-0000-0000-000000000069', null, 'Pystypunnerrus tangolla',             array['shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000070', null, 'Pystypunnerrus käsipainoilla',        array['shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000071', null, 'Vipunostot sivuille',                 array['shoulders']),
  ('10000000-0000-0000-0000-000000000072', null, 'Vipunostot taakse',                   array['shoulders','back']),
  ('10000000-0000-0000-0000-000000000073', null, 'Vipunostot eteen',                    array['shoulders']),
  ('10000000-0000-0000-0000-000000000074', null, 'Arnold-punnerrus',                    array['shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000075', null, 'Vauhtipunnerrus',                     array['shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000076', null, 'Pystypunnerrus koneessa',             array['shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000077', null, 'Vipunostot sivuille taljassa',        array['shoulders']),
  ('10000000-0000-0000-0000-000000000078', null, 'Vipunostot taakse taljassa',          array['shoulders','back']),
  ('10000000-0000-0000-0000-000000000079', null, 'Pystypunnerrus seisten',              array['shoulders','triceps']),
  ('10000000-0000-0000-0000-000000000080', null, 'Hauiskääntö tangolla',                array['biceps']),
  ('10000000-0000-0000-0000-000000000081', null, 'Hauiskääntö käsipainoilla',           array['biceps']),
  ('10000000-0000-0000-0000-000000000082', null, 'Hauiskääntö taljassa',                array['biceps']),
  ('10000000-0000-0000-0000-000000000083', null, 'Keskitetty hauiskääntö',              array['biceps']),
  ('10000000-0000-0000-0000-000000000084', null, 'Hammer-kääntö',                       array['biceps','forearms']),
  ('10000000-0000-0000-0000-000000000085', null, 'Ranskalainen punnerrus',              array['triceps']),
  ('10000000-0000-0000-0000-000000000086', null, 'Ojentajapunnerrus taljassa',          array['triceps']),
  ('10000000-0000-0000-0000-000000000087', null, 'Ojentajapunnerrus käsipainolla',      array['triceps']),
  ('10000000-0000-0000-0000-000000000088', null, 'Dippi',                               array['chest','triceps','shoulders']),
  ('10000000-0000-0000-0000-000000000089', null, 'Dippi koneessa',                      array['chest','triceps']),
  ('10000000-0000-0000-0000-000000000090', null, 'Hauiskääntö scott-penkissä',          array['biceps']),
  ('10000000-0000-0000-0000-000000000091', null, 'Ojentajapunnerrus köydellä',          array['triceps']),
  ('10000000-0000-0000-0000-000000000092', null, 'Ranskalainen punnerrus käsipainoilla',array['triceps']),
  ('10000000-0000-0000-0000-000000000093', null, 'Vatsarutistus',                       array['abs']),
  ('10000000-0000-0000-0000-000000000094', null, 'Jalkojen nosto',                      array['abs']),
  ('10000000-0000-0000-0000-000000000095', null, 'Lankku',                              array['abs','core']),
  ('10000000-0000-0000-0000-000000000096', null, 'Voimapyörä',                          array['abs','core']),
  ('10000000-0000-0000-0000-000000000097', null, 'Venäläinen kierto',                   array['abs','obliques']),
  ('10000000-0000-0000-0000-000000000098', null, 'Vatsarutistus taljassa',              array['abs']),
  ('10000000-0000-0000-0000-000000000099', null, 'Jalkojen nosto tangossa',             array['abs']),
  ('10000000-0000-0000-0000-000000000100', null, 'Sivutaivutus käsipainolla',           array['obliques'])
on conflict (id) do nothing;

-- 2. Names of the OLD templates (the junk to purge) --------------------
create temporary table _old_template_names as
  select distinct name
  from public.exercises
  where created_by is null
    and id::text not like '10000000-%';

-- 3. Drop coaches' UNREFERENCED copies of old-named lifts --------------
delete from public.exercises e
where e.created_by is not null
  and e.name in (select name from _old_template_names)
  and not exists (select 1 from public.program_exercises     x where x.exercise_id = e.id)
  and not exists (select 1 from public.set_logs              x where x.exercise_id = e.id)
  and not exists (select 1 from public.personal_records      x where x.exercise_id = e.id)
  and not exists (select 1 from public.cardio_records        x where x.exercise_id = e.id)
  and not exists (select 1 from public.client_exercise_notes x where x.exercise_id = e.id);

-- 4. Give the 100 to existing coaches ----------------------------------
insert into public.exercises (id, created_by, name, muscle_groups, created_at)
select gen_random_uuid(), p.id, t.name, t.muscle_groups, now()
from public.exercises t
cross join public.profiles p
where t.id::text like '10000000-%'
  and p.role = 'coach'
  and not exists (
    select 1 from public.exercises e2
    where e2.created_by = p.id and e2.name = t.name
  );

-- 5. Delete the old templates (never referenced) -----------------------
delete from public.exercises
where created_by is null
  and id::text not like '10000000-%';

drop table _old_template_names;

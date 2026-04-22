insert into public.exercises (id, created_by, name, instructions, muscle_groups) values
  -- Rinta
  ('00000000-0000-0000-0000-000000000010', null, 'Vinopenkkipunnerrus',      'Penkki 30–45° kulmassa, tangolla tai käsipainoilla.',          array['chest','shoulders','triceps']),
  ('00000000-0000-0000-0000-000000000011', null, 'Laskeva penkkipunnerrus',  'Penkki alaspäin kallistettuna, fokus alarintaan.',             array['chest','triceps']),
  ('00000000-0000-0000-0000-000000000012', null, 'Käsipainoristeys',         'Laaja liikerata, kädet kohtaavat yläasennossa.',               array['chest']),
  ('00000000-0000-0000-0000-000000000013', null, 'Kaapeliristeys',           'Kaapeli rinnan korkeudelta, kontrolloi eksentristä.',          array['chest']),
  ('00000000-0000-0000-0000-000000000014', null, 'Dippi',                    'Vartaloa hieman eteenpäin kallistaen, rintalihakset.',         array['chest','triceps','shoulders']),

  -- Selkä
  ('00000000-0000-0000-0000-000000000015', null, 'Tangolla soutu',           'Lantio 45°, veto navaan, kyynärpäät lähellä kylkiä.',          array['back','biceps']),
  ('00000000-0000-0000-0000-000000000016', null, 'Ylätalja leveäote',        'Pää neutraalina, vedä solisluuhun, purista lavat.',            array['back','biceps']),
  ('00000000-0000-0000-0000-000000000017', null, 'Ylätalja kapea käänteisote','Kyynärpäät lähelle vartaloa, lyhyt pito ala-asennossa.',      array['back','biceps']),
  ('00000000-0000-0000-0000-000000000018', null, 'Kaapelisoutu istuen',      'Selkä suorana, vedä napaan, palauta hallitusti.',              array['back','biceps']),
  ('00000000-0000-0000-0000-000000000019', null, 'Käsipainosoutu',           'Polvi ja käsi tuella, kyynärpää ohittaa kylkiluun.',           array['back','biceps']),
  ('00000000-0000-0000-0000-000000000020', null, 'Selän ojennus',            'Lantio sarjalla, nosta vartalo vaakatasoon, ei yli.',          array['back','glutes','hamstrings']),
  ('00000000-0000-0000-0000-000000000021', null, 'Face pull',                'Kaapeli silmien korkeudella, kyynärpäät ylös, harittaa.',      array['shoulders','back']),

  -- Hartiat
  ('00000000-0000-0000-0000-000000000022', null, 'Sivunostot',               'Kevyt koukistus kyynärpäissä, nosta 90° asti.',                array['shoulders']),
  ('00000000-0000-0000-0000-000000000023', null, 'Etunostot',                'Suorat kädet tai pieni koukistus, nosta olkapään korkeuteen.', array['shoulders']),
  ('00000000-0000-0000-0000-000000000024', null, 'Takaolkanostot',           'Ylävartaloa eteenpäin, kyynärpäät leveällä.',                  array['shoulders','back']),
  ('00000000-0000-0000-0000-000000000025', null, 'Arnold-punnerrus',         'Aloita hanseikurotuksesta, käänny ylöstyönnettäessä.',         array['shoulders','triceps']),
  ('00000000-0000-0000-0000-000000000026', null, 'Olkapäät koneella',        'Selkä tuessa, hallittu liike molempiin suuntiin.',             array['shoulders','triceps']),

  -- Jalat
  ('00000000-0000-0000-0000-000000000027', null, 'Jalkaprässi',              'Jalat lantion levyisessä, polvet varpaiden suuntaan.',         array['quads','glutes','hamstrings']),
  ('00000000-0000-0000-0000-000000000028', null, 'Askelkyykky',              'Pitkä askel, takapolvi lähelle lattiaa, pysty ylävartalo.',    array['quads','glutes','hamstrings']),
  ('00000000-0000-0000-0000-000000000029', null, 'Bulgarialainen kyykky',    'Takajalka penkin päällä, etupolvi 90°.',                       array['quads','glutes','hamstrings']),
  ('00000000-0000-0000-0000-000000000030', null, 'Jalkakoukistus',           'Makuuasento tai istuen, kontrolloi palautus.',                 array['hamstrings']),
  ('00000000-0000-0000-0000-000000000031', null, 'Jalkaojennos',             'Selkä tuessa, ojenna täysin, laske hallitusti.',               array['quads']),
  ('00000000-0000-0000-0000-000000000032', null, 'Pohjenostot seisten',      'Täysi liikerata, pidä ylä-asennossa hetki.',                   array['calves']),
  ('00000000-0000-0000-0000-000000000033', null, 'Sumokyykky',               'Leveä haara-asento, varpaat ulospäin, selkä suorana.',         array['quads','glutes','adductors']),
  ('00000000-0000-0000-0000-000000000034', null, 'Romanian maastaveto',      'Polvet pehmeästi koukussa, lantio taaksepäin, selkä suora.',   array['hamstrings','glutes','back']),
  ('00000000-0000-0000-0000-000000000035', null, 'Hip thrust',               'Yläselkä penkillä, paino lantiolla, purista pakaroita ylhäällä.', array['glutes','hamstrings']),
  ('00000000-0000-0000-0000-000000000036', null, 'Lonkka-abduktori koneella','Hallittu avaus ulospäin, ei keinuntaa.',                       array['glutes','abductors']),
  ('00000000-0000-0000-0000-000000000037', null, 'Sumo maastaveto',          'Leveä ote jalkojen sisäpuolelta, polvet ulospäin.',            array['glutes','hamstrings','back','quads']),

  -- Hauikset
  ('00000000-0000-0000-0000-000000000038', null, 'Tangolla hauiskääntö',     'Kyynärpäät kiinni kylkiin, täysi liikerata.',                  array['biceps']),
  ('00000000-0000-0000-0000-000000000039', null, 'Käsipainohauiskääntö',     'Vuorotellen tai yhtä aikaa, hallittu eksentrnen.',             array['biceps']),
  ('00000000-0000-0000-0000-000000000040', null, 'Vasarakääntö',             'Neutraaliote, kyynärpää paikallaan, hitaasti alas.',           array['biceps','forearms']),
  ('00000000-0000-0000-0000-000000000041', null, 'Kaapelihauiskääntö',       'Jatkuva jännitys koko liikkeen ajan.',                        array['biceps']),

  -- Ojentajat
  ('00000000-0000-0000-0000-000000000042', null, 'Taljapunnerrus alas',      'Kyynärpäät paikallaan, ojenna täysin, rauhallinen palautus.',  array['triceps']),
  ('00000000-0000-0000-0000-000000000043', null, 'Ranskalainen punnerrus',   'Kyynärpäät kohti kattoa, tanko tai käsipainot otsalle.',       array['triceps']),
  ('00000000-0000-0000-0000-000000000044', null, 'Kapea ote penkkipunnerrus','Kädet hartioita leveämmällä, kyynärpäät lähellä vartaloa.',   array['triceps','chest']),
  ('00000000-0000-0000-0000-000000000045', null, 'Ojentajadippi kahvalla',   'Kyynärpäät taaksepäin, ei sivuille.',                         array['triceps']),

  -- Vatsa & ydin
  ('00000000-0000-0000-0000-000000000046', null, 'Vatsarutistus',            'Alaselkä lattiassa, nosta lapaluut irti, hengitä ulos.',       array['abs']),
  ('00000000-0000-0000-0000-000000000047', null, 'Lankku',                   'Suora linja kantapäistä niskaan, pidä asento.',               array['abs','core']),
  ('00000000-0000-0000-0000-000000000048', null, 'Venäläinen kierto',        'Jalat irti lattiasta, kierry puolelta toiselle.',             array['abs','obliques']),
  ('00000000-0000-0000-0000-000000000049', null, 'Jalkanostot riipuen',      'Ripu tangosta, nosta jalat suorana tai polvet koukussa.',     array['abs','hip flexors']),

  -- Muut
  ('00000000-0000-0000-0000-000000000050', null, 'Hartianosto tangolla',     'Suorat kädet, nosta hartiat korvilleen, hidas lasku.',        array['traps'])
on conflict (id) do nothing;

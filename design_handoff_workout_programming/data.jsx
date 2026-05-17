// Jaettu mock-data ohjelmasta. Realistisempi 7 viikkoa, 4 treeniä/viikko.
const PROGRAM_DATA = {
  client: "Jaakko Parkkali",
  programName: "Voimaharjoittelu — kevät '26",
  phases: [
    {
      id: "p1",
      name: "Akkumulaatio",
      weeks: [
        { id: "w1", num: 1, name: "Pohja",        active: false },
        { id: "w2", num: 2, name: "Volyymi +",    active: false },
        { id: "w3", num: 3, name: "Volyymi ++",   active: true  },
        { id: "w4", num: 4, name: "Deload",       active: false },
        { id: "w5", num: 5, name: "Intensiteetti",active: false },
        { id: "w6", num: 6, name: "Peak",         active: false },
        { id: "w7", num: 7, name: "Testi",        active: false },
      ],
    },
  ],
};

// Treenipohjat per viikkopäivä
const SESSION_TEMPLATES = {
  ma: { name: "Alavartalo — voima",  tag: "Voima",     color: "rose"   },
  ti: { name: "Ylävartalo — työntö", tag: "Hypertr.",  color: "amber"  },
  to: { name: "Alavartalo — hypertr.",tag: "Hypertr.", color: "violet" },
  pe: { name: "Ylävartalo — veto",   tag: "Voima",     color: "cyan"   },
};

const EXERCISES_BY_DAY = {
  ma: [
    { name: "Takakyykky",        sets: [{r:5,w:120,rpe:7},{r:5,w:130,rpe:8},{r:5,w:135,rpe:8},{r:5,w:135,rpe:9}] },
    { name: "Romanian maastav.", sets: [{r:8,w:100,rpe:7},{r:8,w:105,rpe:8},{r:8,w:105,rpe:8}] },
    { name: "Bulgarian askel",   sets: [{r:10,w:24,rpe:7},{r:10,w:24,rpe:8},{r:10,w:24,rpe:8}] },
    { name: "Vatsarulla",        sets: [{r:12,w:0,rpe:7},{r:12,w:0,rpe:8},{r:12,w:0,rpe:8}] },
  ],
  ti: [
    { name: "Penkkipunnerrus",   sets: [{r:5,w:90,rpe:7},{r:5,w:95,rpe:8},{r:5,w:97.5,rpe:8},{r:5,w:97.5,rpe:9}] },
    { name: "Vinopenkki kahvak.",sets: [{r:10,w:28,rpe:7},{r:10,w:30,rpe:8},{r:10,w:30,rpe:8}] },
    { name: "Pystypunnerrus",    sets: [{r:8,w:50,rpe:7},{r:8,w:52.5,rpe:8},{r:8,w:52.5,rpe:8}] },
    { name: "Triceps push-down", sets: [{r:12,w:35,rpe:7},{r:12,w:37.5,rpe:8},{r:12,w:37.5,rpe:8}] },
  ],
  to: [
    { name: "Etukyykky",         sets: [{r:6,w:90,rpe:7},{r:6,w:95,rpe:8},{r:6,w:95,rpe:8}] },
    { name: "Hip thrust",        sets: [{r:8,w:120,rpe:7},{r:8,w:130,rpe:8},{r:8,w:130,rpe:8}] },
    { name: "Pohjeprässi",       sets: [{r:12,w:140,rpe:7},{r:12,w:150,rpe:8},{r:12,w:150,rpe:8}] },
    { name: "Plankka",           sets: [{r:60,w:0,rpe:7},{r:60,w:0,rpe:8},{r:60,w:0,rpe:8}] },
  ],
  pe: [
    { name: "Maastaveto",        sets: [{r:3,w:160,rpe:7},{r:3,w:170,rpe:8},{r:3,w:175,rpe:8},{r:3,w:175,rpe:9}] },
    { name: "Leuanveto",         sets: [{r:6,w:0,rpe:7},{r:6,w:5,rpe:8},{r:6,w:5,rpe:8}] },
    { name: "Kulmasoutu",        sets: [{r:8,w:80,rpe:7},{r:8,w:82.5,rpe:8},{r:8,w:82.5,rpe:8}] },
    { name: "Hauiskääntö",       sets: [{r:10,w:14,rpe:7},{r:10,w:16,rpe:8},{r:10,w:16,rpe:8}] },
  ],
};

const DAYS = ["ma", "ti", "to", "pe"];

// Rakenna jokaiselle viikolle treenit. Pieni progressio painoissa per viikko.
function buildSessions(weekNum) {
  const factor = 1 + (weekNum - 1) * 0.025; // ~2.5% / vk
  return DAYS.map((d) => {
    const tpl = SESSION_TEMPLATES[d];
    const ex = EXERCISES_BY_DAY[d].map((e) => ({
      name: e.name,
      sets: e.sets.map((s) => ({
        r: s.r,
        w: s.w ? Math.round(s.w * factor * 2) / 2 : 0,
        rpe: s.rpe,
      })),
    }));
    return { day: d, ...tpl, exercises: ex };
  });
}

// Liitä jokaiseen viikkoon valmiit treenit
PROGRAM_DATA.phases.forEach((ph) => {
  ph.weeks.forEach((w) => {
    w.sessions = buildSessions(w.num);
  });
});

const COLORS = {
  rose:   { fg: "#FF7AA8", bg: "rgba(255,122,168,0.10)", line: "rgba(255,122,168,0.35)" },
  amber:  { fg: "#F2B872", bg: "rgba(242,184,114,0.10)", line: "rgba(242,184,114,0.35)" },
  violet: { fg: "#B69CFF", bg: "rgba(182,156,255,0.10)", line: "rgba(182,156,255,0.35)" },
  cyan:   { fg: "#7BD3E5", bg: "rgba(123,211,229,0.10)", line: "rgba(123,211,229,0.35)" },
};

const DAY_LABEL = { ma: "MA", ti: "TI", to: "TO", pe: "PE" };

window.PROGRAM_DATA = PROGRAM_DATA;
window.COLORS = COLORS;
window.DAY_LABEL = DAY_LABEL;
window.DAYS = DAYS;

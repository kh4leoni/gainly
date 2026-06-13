// Seed a polished demo environment for marketing screenshots.
//
// Creates one coach ("Valmentaja Ville") and four clients with Finnish names
// (Maija/Matti Meikäläinen, Liisa Virtanen, Antti Korhonen). Each client gets:
//   - a 4-week workout program with realistic completed history (→ auto PRs)
//   - a meal plan built from real Fineli foods
//   - a chat thread with a few messages
//
//   npx tsx supabase/scripts/seed-demo.ts
//
// Idempotent: deletes any prior demo users (by email) and their data first,
// then recreates everything from scratch. Requires local Supabase running and
// Fineli foods imported (import-fineli.ts).

import { createClient } from "@supabase/supabase-js";

const LOCAL_DEFAULT_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_DEFAULT_SERVICE_ROLE_KEY;

const admin = createClient(url, key, { auth: { persistSession: false } });

const PASSWORD = "password";
const ACTIVE_WEEK = 3; // weeks 1–2 done, week 3 in progress, week 4 planned

// ── Types ────────────────────────────────────────────────────────────────
type ExDef = { name: string; baseW: number; reps: number; sets: number; rpe: number };
type DayDef = { name: string; exercises: ExDef[] };
type ProgramDef = {
  title: string;
  description: string;
  block: string;
  weeks: { num: number; name: string }[];
  days: DayDef[];
};
// Fineli search term + grams
type Item = [string, number];
type Opt = { name?: string; items: Item[] };
type MealPlanDef = {
  title: string;
  description: string;
  days: Array<{ day: string; meals: Array<{ name: string; options: Opt[] }> }>;
};
type ClientDef = {
  email: string;
  full_name: string;
  phone: string;
  program: ProgramDef;
  mealPlan: MealPlanDef;
  messages: Array<{ from: "coach" | "client"; text: string; daysAgo: number }>;
};

const one = (items: Item[]): Opt[] => [{ items }];
const STD_WEEKS = [
  { num: 1, name: "Pohja" },
  { num: 2, name: "Volyymi" },
  { num: 3, name: "Intensiteetti" },
  { num: 4, name: "Huippu" },
];

// ── Clients ──────────────────────────────────────────────────────────────
const CLIENTS: ClientDef[] = [
  {
    email: "maija@gainly.local",
    full_name: "Maija Meikäläinen",
    phone: "+358 40 123 4567",
    program: {
      title: "Ylä-/alakroppa-jako (4 vk)",
      description: "Lihasmassan kasvatus. 4 treeniä viikossa, ylä- ja alakroppa vuorotellen.",
      block: "Hypertrofia",
      weeks: STD_WEEKS,
      days: [
        {
          name: "Ylä A",
          exercises: [
            { name: "Penkkipunnerrus", baseW: 45, reps: 10, sets: 4, rpe: 8 },
            { name: "Tangolla soutu", baseW: 40, reps: 10, sets: 4, rpe: 8 },
            { name: "Pystypunnerrus", baseW: 25, reps: 10, sets: 3, rpe: 8 },
            { name: "Käsipainohauiskääntö", baseW: 12, reps: 12, sets: 3, rpe: 8 },
            { name: "Ranskalainen punnerrus", baseW: 20, reps: 12, sets: 3, rpe: 8 },
          ],
        },
        {
          name: "Ala A",
          exercises: [
            { name: "Takakyykky", baseW: 60, reps: 8, sets: 4, rpe: 8 },
            { name: "Romanian maastaveto", baseW: 55, reps: 10, sets: 3, rpe: 8 },
            { name: "Jalkaprässi", baseW: 120, reps: 12, sets: 3, rpe: 8 },
            { name: "Pohjenostot seisten", baseW: 40, reps: 15, sets: 3, rpe: 7 },
            { name: "Vatsarutistus", baseW: 0, reps: 15, sets: 3, rpe: 7 },
          ],
        },
        {
          name: "Ylä B",
          exercises: [
            { name: "Vinopenkkipunnerrus", baseW: 35, reps: 10, sets: 4, rpe: 8 },
            { name: "Ylätalja leveäote", baseW: 45, reps: 10, sets: 4, rpe: 8 },
            { name: "Sivunostot", baseW: 8, reps: 15, sets: 3, rpe: 8 },
            { name: "Vasarakääntö", baseW: 12, reps: 12, sets: 3, rpe: 8 },
            { name: "Ojentajadippi kahvalla", baseW: 25, reps: 12, sets: 3, rpe: 8 },
          ],
        },
        {
          name: "Ala B",
          exercises: [
            { name: "Maastaveto", baseW: 70, reps: 6, sets: 4, rpe: 8 },
            { name: "Askelkyykky", baseW: 16, reps: 10, sets: 3, rpe: 8 },
            { name: "Jalkakoukistus", baseW: 35, reps: 12, sets: 3, rpe: 8 },
            { name: "Jalkaojennos", baseW: 40, reps: 15, sets: 3, rpe: 7 },
            { name: "Lankku", baseW: 0, reps: 60, sets: 3, rpe: 7 },
          ],
        },
      ],
    },
    mealPlan: {
      title: "Lihasmassan ruokavalio ~2200 kcal",
      description: "Runsasproteiininen ruokavalio lihasmassan kasvatukseen.",
      days: [
        {
          day: "Arkipäivä",
          meals: [
            {
              name: "Aamupala",
              options: [
                { name: "Kaurapuuro", items: [["kaurahiutale", 80], ["maito, rasvaton", 250], ["banaani", 120]] },
                { name: "Munakas", items: [["kananmuna", 150], ["ruisleipä", 70], ["juusto", 30]] },
              ],
            },
            { name: "Lounas", options: one([["broileri", 150], ["riisi, keitetty", 200], ["porkkana", 100]]) },
            { name: "Välipala", options: one([["raejuusto", 200], ["omena", 130]]) },
            { name: "Päivällinen", options: one([["lohi", 150], ["peruna", 250], ["parsakaali", 150]]) },
          ],
        },
        {
          day: "Treenipäivä",
          meals: [
            { name: "Aamupala", options: one([["kananmuna", 120], ["ruisleipä", 70], ["juusto", 30]]) },
            { name: "Lounas", options: one([["jauheliha, naudan", 150], ["pasta, keitetty", 220]]) },
            { name: "Palautusjuoma", options: one([["heraproteiini", 35], ["banaani", 120]]) },
            { name: "Päivällinen", options: one([["broileri", 180], ["bataatti", 250]]) },
          ],
        },
      ],
    },
    messages: [
      { from: "coach", text: "Moikka Maija! Laitoin sulle uuden ohjelman ja ruokavalion. Katotaas miltä tuntuu!", daysAgo: 6 },
      { from: "client", text: "Kiitos! Ylä A tuntui tosi hyvältä, penkki nousi kivasti 👍", daysAgo: 5 },
      { from: "coach", text: "Mahtavaa! Pidä lepopäivät kunnolla niin palautuminen pysyy hyvänä.", daysAgo: 5 },
      { from: "client", text: "Jep. Pitäiskö välipalan proteiinia nostaa?", daysAgo: 1 },
    ],
  },
  {
    email: "matti@gainly.local",
    full_name: "Matti Meikäläinen",
    phone: "+358 50 234 5678",
    program: {
      title: "Voimaharjoittelu 5×5 (4 vk)",
      description: "Perusvoiman kehitys raskailla moninivelliikkeillä. 3 treeniä viikossa.",
      block: "Voima",
      weeks: STD_WEEKS,
      days: [
        {
          name: "Treeni A",
          exercises: [
            { name: "Takakyykky", baseW: 100, reps: 5, sets: 5, rpe: 8 },
            { name: "Penkkipunnerrus", baseW: 80, reps: 5, sets: 5, rpe: 8 },
            { name: "Tangolla soutu", baseW: 60, reps: 5, sets: 5, rpe: 8 },
          ],
        },
        {
          name: "Treeni B",
          exercises: [
            { name: "Takakyykky", baseW: 100, reps: 5, sets: 5, rpe: 8 },
            { name: "Pystypunnerrus", baseW: 50, reps: 5, sets: 5, rpe: 8 },
            { name: "Maastaveto", baseW: 120, reps: 5, sets: 1, rpe: 8 },
          ],
        },
        {
          name: "Treeni C",
          exercises: [
            { name: "Takakyykky", baseW: 100, reps: 5, sets: 5, rpe: 8 },
            { name: "Penkkipunnerrus", baseW: 80, reps: 5, sets: 5, rpe: 8 },
            { name: "Leuanveto", baseW: 0, reps: 8, sets: 4, rpe: 8 },
          ],
        },
      ],
    },
    mealPlan: {
      title: "Voimaurheilijan ruokavalio ~2800 kcal",
      description: "Energiapainotteinen ruokavalio voimaharjoitteluun ja palautumiseen.",
      days: [
        {
          day: "Arkipäivä",
          meals: [
            { name: "Aamupala", options: one([["kaurahiutale", 100], ["maito", 300], ["kananmuna", 120]]) },
            { name: "Lounas", options: one([["jauheliha, naudan", 180], ["riisi, keitetty", 250], ["porkkana", 100]]) },
            { name: "Välipala", options: one([["raejuusto", 250], ["banaani", 120]]) },
            { name: "Päivällinen", options: one([["lohi", 180], ["peruna", 300], ["parsakaali", 150]]) },
            { name: "Iltapala", options: one([["rahka", 200], ["mustikka", 100]]) },
          ],
        },
        {
          day: "Treenipäivä",
          meals: [
            { name: "Aamupala", options: one([["kaurahiutale", 100], ["maito", 300], ["banaani", 120]]) },
            {
              name: "Lounas",
              options: [
                { name: "Liha", items: [["jauheliha, naudan", 200], ["pasta, keitetty", 280]] },
                { name: "Kana", items: [["broileri", 200], ["riisi, keitetty", 280]] },
              ],
            },
            { name: "Palautusjuoma", options: one([["heraproteiini", 40], ["banaani", 150]]) },
            { name: "Päivällinen", options: one([["broileri", 200], ["bataatti", 300]]) },
          ],
        },
      ],
    },
    messages: [
      { from: "client", text: "Moi! Takakyykky tuntui tänään raskaalta vitosilla, RPE meni varmaan 9.", daysAgo: 3 },
      { from: "coach", text: "Hyvä huomio. Pidetään paino samana ensi viikolle ja katotaan tekniikkavideo.", daysAgo: 3 },
      { from: "client", text: "Selvä, kuvaan ensi treenissä 💪", daysAgo: 2 },
    ],
  },
  {
    email: "liisa@gainly.local",
    full_name: "Liisa Virtanen",
    phone: "+358 44 345 6789",
    program: {
      title: "Koko kehon kuntopiiri (4 vk)",
      description: "Kokonaisvaltainen kunto-ohjelma rasvanpolttoon. 3 koko kehon treeniä viikossa.",
      block: "Kunto",
      weeks: STD_WEEKS,
      days: [
        {
          name: "Treeni A",
          exercises: [
            { name: "Sumokyykky", baseW: 30, reps: 12, sets: 3, rpe: 7 },
            { name: "Taljapunnerrus alas", baseW: 35, reps: 12, sets: 3, rpe: 7 },
            { name: "Käsipainosoutu", baseW: 12, reps: 12, sets: 3, rpe: 7 },
            { name: "Lankku", baseW: 0, reps: 45, sets: 3, rpe: 7 },
          ],
        },
        {
          name: "Treeni B",
          exercises: [
            { name: "Askelkyykky", baseW: 10, reps: 12, sets: 3, rpe: 7 },
            { name: "Pystypunnerrus", baseW: 15, reps: 12, sets: 3, rpe: 7 },
            { name: "Kaapelisoutu istuen", baseW: 35, reps: 12, sets: 3, rpe: 7 },
            { name: "Vatsarutistus", baseW: 0, reps: 20, sets: 3, rpe: 7 },
          ],
        },
        {
          name: "Treeni C",
          exercises: [
            { name: "Jalkaprässi", baseW: 90, reps: 15, sets: 3, rpe: 7 },
            { name: "Vinopenkkipunnerrus", baseW: 20, reps: 12, sets: 3, rpe: 7 },
            { name: "Ylätalja leveäote", baseW: 35, reps: 12, sets: 3, rpe: 7 },
            { name: "Venäläinen kierto", baseW: 5, reps: 20, sets: 3, rpe: 7 },
          ],
        },
      ],
    },
    mealPlan: {
      title: "Rasvanpolton ruokavalio ~1700 kcal",
      description: "Proteiinipainotteinen ruokavalio kevyellä energiavajeella.",
      days: [
        {
          day: "Arkipäivä",
          meals: [
            { name: "Aamupala", options: one([["kaurahiutale", 50], ["maito, rasvaton", 200], ["mustikka", 100]]) },
            { name: "Lounas", options: one([["broileri", 130], ["riisi, keitetty", 150], ["parsakaali", 150]]) },
            { name: "Välipala", options: one([["raejuusto", 150], ["omena", 130]]) },
            { name: "Päivällinen", options: one([["lohi", 130], ["peruna", 200], ["porkkana", 100]]) },
          ],
        },
      ],
    },
    messages: [
      { from: "coach", text: "Hei Liisa! Aloitetaan kevyemmällä energiavajeella, ei kiirettä.", daysAgo: 4 },
      { from: "client", text: "Kiva, nälkä ei ole ollut paha ja jaksan treeneissä hyvin 🙂", daysAgo: 2 },
    ],
  },
  {
    email: "antti@gainly.local",
    full_name: "Antti Korhonen",
    phone: "+358 45 456 7890",
    program: {
      title: "Työnnä / Vedä / Jalat (4 vk)",
      description: "Klassinen PPL-jako lihasmassalle ja voimalle. 3 treeniä viikossa.",
      block: "Hypertrofia",
      weeks: STD_WEEKS,
      days: [
        {
          name: "Työnnä",
          exercises: [
            { name: "Penkkipunnerrus", baseW: 70, reps: 8, sets: 4, rpe: 8 },
            { name: "Pystypunnerrus", baseW: 40, reps: 8, sets: 4, rpe: 8 },
            { name: "Vinopenkkipunnerrus", baseW: 30, reps: 10, sets: 3, rpe: 8 },
            { name: "Sivunostot", baseW: 10, reps: 15, sets: 3, rpe: 8 },
            { name: "Dippi", baseW: 0, reps: 10, sets: 3, rpe: 8 },
          ],
        },
        {
          name: "Vedä",
          exercises: [
            { name: "Maastaveto", baseW: 110, reps: 5, sets: 4, rpe: 8 },
            { name: "Leuanveto", baseW: 0, reps: 8, sets: 4, rpe: 8 },
            { name: "Tangolla soutu", baseW: 55, reps: 8, sets: 4, rpe: 8 },
            { name: "Kasvoveto", baseW: 25, reps: 15, sets: 3, rpe: 8 },
            { name: "Tangolla hauiskääntö", baseW: 30, reps: 10, sets: 3, rpe: 8 },
          ],
        },
        {
          name: "Jalat",
          exercises: [
            { name: "Takakyykky", baseW: 90, reps: 6, sets: 4, rpe: 8 },
            { name: "Romanian maastaveto", baseW: 70, reps: 8, sets: 3, rpe: 8 },
            { name: "Jalkaprässi", baseW: 140, reps: 12, sets: 3, rpe: 8 },
            { name: "Jalkakoukistus", baseW: 40, reps: 12, sets: 3, rpe: 8 },
            { name: "Pohjenostot seisten", baseW: 50, reps: 15, sets: 3, rpe: 7 },
          ],
        },
      ],
    },
    mealPlan: {
      title: "Massan ruokavalio ~2600 kcal",
      description: "Tasapainoinen ruokavalio lihasmassan kasvatukseen.",
      days: [
        {
          day: "Arkipäivä",
          meals: [
            { name: "Aamupala", options: one([["kaurahiutale", 90], ["maito", 250], ["kananmuna", 120]]) },
            { name: "Lounas", options: one([["broileri", 170], ["riisi, keitetty", 220], ["porkkana", 100]]) },
            { name: "Välipala", options: one([["rahka", 200], ["banaani", 120]]) },
            { name: "Päivällinen", options: one([["jauheliha, naudan", 170], ["peruna", 280], ["parsakaali", 150]]) },
          ],
        },
        {
          day: "Treenipäivä",
          meals: [
            { name: "Aamupala", options: one([["kaurahiutale", 90], ["maito", 250], ["banaani", 120]]) },
            { name: "Lounas", options: one([["broileri", 200], ["pasta, keitetty", 260]]) },
            { name: "Palautusjuoma", options: one([["heraproteiini", 35], ["banaani", 120]]) },
            { name: "Päivällinen", options: one([["lohi", 180], ["bataatti", 280]]) },
          ],
        },
      ],
    },
    messages: [
      { from: "client", text: "Moro! Maastaveto meni tänään uuteen ennätykseen 🎉", daysAgo: 2 },
      { from: "coach", text: "Huikeaa Antti! Hieno PR. Muista nukkua kunnolla niin jatkuu nousu.", daysAgo: 2 },
    ],
  },
  {
    email: "sanna@gainly.local",
    full_name: "Sanna Nieminen",
    phone: "+358 40 567 8901",
    program: {
      title: "Aloittelijan koko keho (4 vk)",
      description: "Selkeä aloitusohjelma kuntosaliharjoittelun perusteisiin. 3 koko kehon treeniä viikossa.",
      block: "Perusta",
      weeks: STD_WEEKS,
      days: [
        {
          name: "Treeni A",
          exercises: [
            { name: "Takakyykky", baseW: 30, reps: 10, sets: 3, rpe: 7 },
            { name: "Penkkipunnerrus", baseW: 25, reps: 10, sets: 3, rpe: 7 },
            { name: "Kaapelisoutu istuen", baseW: 30, reps: 12, sets: 3, rpe: 7 },
            { name: "Lankku", baseW: 0, reps: 30, sets: 3, rpe: 7 },
          ],
        },
        {
          name: "Treeni B",
          exercises: [
            { name: "Jalkaprässi", baseW: 70, reps: 12, sets: 3, rpe: 7 },
            { name: "Pystypunnerrus", baseW: 15, reps: 10, sets: 3, rpe: 7 },
            { name: "Ylätalja leveäote", baseW: 30, reps: 12, sets: 3, rpe: 7 },
            { name: "Vatsarutistus", baseW: 0, reps: 15, sets: 3, rpe: 7 },
          ],
        },
        {
          name: "Treeni C",
          exercises: [
            { name: "Romanian maastaveto", baseW: 30, reps: 10, sets: 3, rpe: 7 },
            { name: "Vinopenkkipunnerrus", baseW: 20, reps: 10, sets: 3, rpe: 7 },
            { name: "Käsipainosoutu", baseW: 10, reps: 12, sets: 3, rpe: 7 },
            { name: "Pohjenostot seisten", baseW: 30, reps: 15, sets: 3, rpe: 7 },
          ],
        },
      ],
    },
    mealPlan: {
      title: "Tasapainoinen ruokavalio ~1900 kcal",
      description: "Monipuolinen perusruokavalio aktiiviselle aloittelijalle.",
      days: [
        {
          day: "Arkipäivä",
          meals: [
            { name: "Aamupala", options: one([["kaurahiutale", 60], ["maito, rasvaton", 200], ["banaani", 100]]) },
            { name: "Lounas", options: one([["broileri", 140], ["riisi, keitetty", 180], ["porkkana", 100]]) },
            { name: "Välipala", options: one([["raejuusto", 150], ["omena", 130]]) },
            { name: "Päivällinen", options: one([["lohi", 140], ["peruna", 220], ["parsakaali", 150]]) },
          ],
        },
      ],
    },
    messages: [
      { from: "coach", text: "Tervetuloa Sanna! Aloitetaan rauhassa perustekniikoista, kysy rohkeasti mitä vaan.", daysAgo: 5 },
      { from: "client", text: "Kiitos! Vähän jännittää sali mutta into on kova 😊", daysAgo: 4 },
      { from: "coach", text: "Ei syytä jännittää, mennään askel kerrallaan. Hienoa että lähdit mukaan!", daysAgo: 4 },
    ],
  },
  {
    email: "juha@gainly.local",
    full_name: "Juha Mäkinen",
    phone: "+358 50 678 9012",
    program: {
      title: "Massa ja voima (4 vk)",
      description: "Yhdistelmäohjelma lihasmassalle ja voimalle. 4 treeniä viikossa.",
      block: "Massa",
      weeks: STD_WEEKS,
      days: [
        {
          name: "Ylä raskas",
          exercises: [
            { name: "Penkkipunnerrus", baseW: 85, reps: 6, sets: 4, rpe: 8 },
            { name: "Tangolla soutu", baseW: 65, reps: 6, sets: 4, rpe: 8 },
            { name: "Pystypunnerrus", baseW: 50, reps: 8, sets: 3, rpe: 8 },
            { name: "Leuanveto", baseW: 0, reps: 8, sets: 3, rpe: 8 },
          ],
        },
        {
          name: "Ala raskas",
          exercises: [
            { name: "Takakyykky", baseW: 110, reps: 6, sets: 4, rpe: 8 },
            { name: "Romanian maastaveto", baseW: 90, reps: 8, sets: 3, rpe: 8 },
            { name: "Jalkaprässi", baseW: 160, reps: 10, sets: 3, rpe: 8 },
            { name: "Pohjenostot seisten", baseW: 60, reps: 15, sets: 3, rpe: 7 },
          ],
        },
        {
          name: "Ylä volyymi",
          exercises: [
            { name: "Vinopenkkipunnerrus", baseW: 50, reps: 10, sets: 3, rpe: 8 },
            { name: "Ylätalja leveäote", baseW: 55, reps: 10, sets: 3, rpe: 8 },
            { name: "Sivunostot", baseW: 12, reps: 15, sets: 3, rpe: 8 },
            { name: "Tangolla hauiskääntö", baseW: 35, reps: 10, sets: 3, rpe: 8 },
          ],
        },
        {
          name: "Ala volyymi",
          exercises: [
            { name: "Etunostot", baseW: 0, reps: 12, sets: 3, rpe: 8 },
            { name: "Askelkyykky", baseW: 20, reps: 10, sets: 3, rpe: 8 },
            { name: "Jalkakoukistus", baseW: 45, reps: 12, sets: 3, rpe: 8 },
            { name: "Vatsarutistus", baseW: 0, reps: 20, sets: 3, rpe: 7 },
          ],
        },
      ],
    },
    mealPlan: {
      title: "Massan ruokavalio ~3000 kcal",
      description: "Runsasenerginen ruokavalio lihasmassan kasvatukseen ja voiman kehitykseen.",
      days: [
        {
          day: "Arkipäivä",
          meals: [
            { name: "Aamupala", options: one([["kaurahiutale", 120], ["maito", 300], ["kananmuna", 150]]) },
            { name: "Lounas", options: one([["jauheliha, naudan", 200], ["riisi, keitetty", 280], ["porkkana", 100]]) },
            { name: "Välipala", options: one([["raejuusto", 250], ["banaani", 120]]) },
            { name: "Päivällinen", options: one([["broileri", 220], ["peruna", 320], ["parsakaali", 150]]) },
            { name: "Iltapala", options: one([["rahka", 250], ["mustikka", 100]]) },
          ],
        },
        {
          day: "Treenipäivä",
          meals: [
            { name: "Aamupala", options: one([["kaurahiutale", 120], ["maito", 300], ["banaani", 150]]) },
            { name: "Lounas", options: one([["jauheliha, naudan", 220], ["pasta, keitetty", 300]]) },
            { name: "Palautusjuoma", options: one([["heraproteiini", 45], ["banaani", 150]]) },
            { name: "Päivällinen", options: one([["lohi", 200], ["bataatti", 320]]) },
          ],
        },
      ],
    },
    messages: [
      { from: "client", text: "Moi! Penkki tuntui hyvältä, sain raskaat kutoset menemään puhtaasti.", daysAgo: 3 },
      { from: "coach", text: "Loistavaa Juha! Ensi viikolla nostetaan 2,5 kg lisää penkkiin.", daysAgo: 3 },
    ],
  },
  {
    email: "elina@gainly.local",
    full_name: "Elina Laine",
    phone: "+358 44 789 0123",
    program: {
      title: "Kiinteytys ja kunto (4 vk)",
      description: "Kokonaisvaltainen ohjelma kehonkoostumuksen kohentamiseen. 3 treeniä viikossa.",
      block: "Kunto",
      weeks: STD_WEEKS,
      days: [
        {
          name: "Alakroppa",
          exercises: [
            { name: "Sumokyykky", baseW: 35, reps: 12, sets: 4, rpe: 7 },
            { name: "Romanian maastaveto", baseW: 40, reps: 12, sets: 3, rpe: 7 },
            { name: "Askelkyykky", baseW: 12, reps: 12, sets: 3, rpe: 7 },
            { name: "Lonkkaojennus", baseW: 30, reps: 15, sets: 3, rpe: 7 },
          ],
        },
        {
          name: "Yläkroppa",
          exercises: [
            { name: "Taljapunnerrus alas", baseW: 30, reps: 12, sets: 3, rpe: 7 },
            { name: "Kaapelisoutu istuen", baseW: 35, reps: 12, sets: 3, rpe: 7 },
            { name: "Sivunostot", baseW: 6, reps: 15, sets: 3, rpe: 7 },
            { name: "Käsipainohauiskääntö", baseW: 8, reps: 12, sets: 3, rpe: 7 },
          ],
        },
        {
          name: "Keskivartalo & kunto",
          exercises: [
            { name: "Jalkaprässi", baseW: 80, reps: 15, sets: 3, rpe: 7 },
            { name: "Lankku", baseW: 0, reps: 40, sets: 3, rpe: 7 },
            { name: "Venäläinen kierto", baseW: 6, reps: 20, sets: 3, rpe: 7 },
            { name: "Vatsarutistus", baseW: 0, reps: 20, sets: 3, rpe: 7 },
          ],
        },
      ],
    },
    mealPlan: {
      title: "Kevyen energiavajeen ruokavalio ~1600 kcal",
      description: "Proteiinipainotteinen ruokavalio kehonkoostumuksen kohentamiseen.",
      days: [
        {
          day: "Arkipäivä",
          meals: [
            { name: "Aamupala", options: one([["raejuusto", 150], ["mustikka", 100], ["kaurahiutale", 40]]) },
            { name: "Lounas", options: one([["broileri", 130], ["riisi, keitetty", 130], ["parsakaali", 150]]) },
            { name: "Välipala", options: one([["rahka", 150], ["omena", 130]]) },
            { name: "Päivällinen", options: one([["lohi", 120], ["peruna", 180], ["porkkana", 100]]) },
          ],
        },
      ],
    },
    messages: [
      { from: "coach", text: "Hei Elina! Ohjelma ja ruokavalio on nyt valmiina. Energiavaje on maltillinen.", daysAgo: 4 },
      { from: "client", text: "Kiitos! Tykkään että aterioissa on selkeät määrät, helppo seurata 👍", daysAgo: 3 },
      { from: "coach", text: "Juuri niin sen kuuluu mennä. Viikon päästä katsotaan miltä tuntuu.", daysAgo: 3 },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);
function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function progressionFactor(weekNum: number) {
  return 1 + (weekNum - 1) * 0.025;
}
function roundW(w: number) {
  return Math.round(w * 2) / 2;
}

function planStatus(weekNum: number, dayIdx: number): {
  status: "completed" | "pending";
  scheduled_date: string | null;
  completed_at: string | null;
  overshoot: number;
} {
  if (weekNum < ACTIVE_WEEK) {
    const offset = (ACTIVE_WEEK - weekNum) * 7 + (5 - dayIdx);
    return {
      status: "completed",
      scheduled_date: daysAgoISO(offset).slice(0, 10),
      completed_at: daysAgoISO(offset),
      overshoot: 2.5,
    };
  }
  if (weekNum === ACTIVE_WEEK && dayIdx === 0) {
    return { status: "completed", scheduled_date: daysAgoISO(2).slice(0, 10), completed_at: daysAgoISO(2), overshoot: 2.5 };
  }
  if (weekNum === ACTIVE_WEEK && dayIdx === 1) {
    return { status: "pending", scheduled_date: todayStr(), completed_at: null, overshoot: 0 };
  }
  return { status: "pending", scheduled_date: null, completed_at: null, overshoot: 0 };
}

async function deleteDemoUsers() {
  const emails = new Set<string>(["coach-demo@gainly.local", ...CLIENTS.map((c) => c.email)]);
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data?.users ?? []) {
    if (u.email && emails.has(u.email)) {
      await admin.auth.admin.deleteUser(u.id);
      console.log(`  removed prior ${u.email}`);
    }
  }
}

async function createUser(email: string, full_name: string, role: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role, full_name },
  });
  if (error) throw error;
  return data.user!.id;
}

async function seedProgram(coachId: string, clientId: string, def: ProgramDef) {
  const exNames = [...new Set(def.days.flatMap((d) => d.exercises.map((e) => e.name)))];
  const { data: coachEx, error: exErr } = await admin
    .from("exercises")
    .select("id, name")
    .eq("created_by", coachId)
    .in("name", exNames);
  if (exErr) throw exErr;
  const exId = new Map((coachEx ?? []).map((e: { id: string; name: string }) => [e.name, e.id]));
  const missing = exNames.filter((n) => !exId.has(n));
  if (missing.length > 0) throw new Error(`Coach missing exercises: ${missing.join(", ")}`);

  const { data: prog, error: progErr } = await admin
    .from("programs")
    .insert({ coach_id: coachId, client_id: clientId, title: def.title, description: def.description })
    .select("id")
    .single();
  if (progErr || !prog) throw progErr ?? new Error("program insert failed");

  const { data: block } = await admin
    .from("program_blocks")
    .insert({ program_id: prog.id, block_number: 1, name: def.block })
    .select("id")
    .single();

  for (const wk of def.weeks) {
    const { data: week } = await admin
      .from("program_weeks")
      .insert({ program_id: prog.id, block_id: block!.id, week_number: wk.num, name: wk.name, is_active: wk.num === ACTIVE_WEEK })
      .select("id")
      .single();

    for (let dayIdx = 0; dayIdx < def.days.length; dayIdx++) {
      const dayDef = def.days[dayIdx]!;
      const { data: day } = await admin
        .from("program_days")
        .insert({ week_id: week!.id, day_number: dayIdx + 1, name: dayDef.name })
        .select("id")
        .single();

      const peRows: Array<{ id: string; exercise_id: string; ex: ExDef; w: number }> = [];
      for (let i = 0; i < dayDef.exercises.length; i++) {
        const ex = dayDef.exercises[i]!;
        const factor = progressionFactor(wk.num);
        const w = ex.baseW > 0 ? roundW(ex.baseW * factor) : 0;
        const set_configs = Array.from({ length: ex.sets }, (_, si) => ({
          reps: String(ex.reps),
          weight: w || null,
          rpe: si < Math.ceil(ex.sets / 2) ? Math.max(ex.rpe - 1, 6) : ex.rpe,
        }));
        const { data: pe } = await admin
          .from("program_exercises")
          .insert({
            day_id: day!.id,
            exercise_id: exId.get(ex.name)!,
            order_idx: i,
            sets: ex.sets,
            reps: String(ex.reps),
            intensity: w || null,
            intensity_type: "kg",
            target_rpe: ex.rpe,
            set_configs,
            rest_sec: 120,
          })
          .select("id, exercise_id")
          .single();
        peRows.push({ id: pe!.id, exercise_id: pe!.exercise_id!, ex, w });
      }

      const plan = planStatus(wk.num, dayIdx);
      const { data: sw } = await admin
        .from("scheduled_workouts")
        .insert({
          program_id: prog.id,
          day_id: day!.id,
          client_id: clientId,
          status: plan.status,
          scheduled_date: plan.scheduled_date,
          completed_at: plan.completed_at,
        })
        .select("id")
        .single();

      if (plan.status === "completed") {
        const { data: wl } = await admin
          .from("workout_logs")
          .insert({ client_id: clientId, scheduled_workout_id: sw!.id, logged_at: plan.completed_at! })
          .select("id")
          .single();

        const logs: Array<Record<string, unknown>> = [];
        for (const pr of peRows) {
          for (let si = 0; si < pr.ex.sets; si++) {
            const actualReps = si === pr.ex.sets - 1 ? Math.max(pr.ex.reps - 1, 1) : pr.ex.reps;
            const actualW = pr.w > 0 ? pr.w + plan.overshoot : 0;
            const plannedRpe = si < Math.ceil(pr.ex.sets / 2) ? Math.max(pr.ex.rpe - 1, 6) : pr.ex.rpe;
            logs.push({
              workout_log_id: wl!.id,
              program_exercise_id: pr.id,
              exercise_id: pr.exercise_id,
              set_number: si + 1,
              reps: actualReps,
              weight: actualW || null,
              rpe: Math.min(plannedRpe + 0.5, 10),
            });
          }
        }
        const { error: logErr } = await admin.from("set_logs").insert(logs);
        if (logErr) throw logErr;
      }
    }
  }
  return prog.id;
}

const pickFood = async (term: string) => {
  const { data } = await admin
    .from("foods")
    .select("id, name_fi")
    .ilike("name_fi", `%${term}%`)
    .not("energy_kcal", "is", null)
    .order("name_fi")
    .limit(1)
    .maybeSingle();
  return data as { id: number; name_fi: string } | null;
};

async function seedMealPlan(coachId: string, clientId: string, def: MealPlanDef) {
  const { data: plan, error } = await admin
    .from("meal_plans")
    .insert({ coach_id: coachId, client_id: clientId, title: def.title, description: def.description })
    .select("id")
    .single();
  if (error || !plan) throw error ?? new Error("meal_plan insert failed");

  for (let d = 0; d < def.days.length; d++) {
    const dayDef = def.days[d]!;
    const { data: day } = await admin
      .from("meal_plan_days")
      .insert({ plan_id: plan.id, day_number: d + 1, name: dayDef.day })
      .select("id")
      .single();

    for (let mi = 0; mi < dayDef.meals.length; mi++) {
      const mealDef = dayDef.meals[mi]!;
      const { data: meal } = await admin
        .from("meals")
        .insert({ day_id: day!.id, order_idx: mi + 1, name: mealDef.name })
        .select("id")
        .single();

      for (let oi = 0; oi < mealDef.options.length; oi++) {
        const optDef = mealDef.options[oi]!;
        const { data: option } = await admin
          .from("meal_options")
          .insert({ meal_id: meal!.id, order_idx: oi, name: optDef.name ?? null })
          .select("id")
          .single();

        let ii = 0;
        for (const [term, grams] of optDef.items) {
          const food = await pickFood(term);
          if (!food) {
            console.warn(`    ! no food for "${term}" — skipped`);
            continue;
          }
          await admin.from("meal_items").insert({
            meal_option_id: option!.id,
            food_id: food.id,
            food_name: food.name_fi,
            amount_g: grams,
            order_idx: ++ii,
          });
        }
      }
    }
  }
}

async function seedThread(coachId: string, clientId: string, msgs: ClientDef["messages"]) {
  const { data: thread } = await admin
    .from("threads")
    .upsert({ coach_id: coachId, client_id: clientId }, { onConflict: "coach_id,client_id" })
    .select("id")
    .single();

  let last = "";
  for (const m of msgs) {
    const ts = daysAgoISO(m.daysAgo);
    last = ts;
    await admin.from("messages").insert({
      thread_id: thread!.id,
      sender_id: m.from === "coach" ? coachId : clientId,
      content: m.text,
      created_at: ts,
      read_at: ts,
    });
  }
  await admin.from("threads").update({ last_message_at: last }).eq("id", thread!.id);
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("Cleaning prior demo data…");
  await deleteDemoUsers();

  console.log("Creating coach…");
  const coachId = await createUser("coach-demo@gainly.local", "Valmentaja Ville", "coach");
  console.log(`  Valmentaja Ville → ${coachId}`);

  for (const c of CLIENTS) {
    console.log(`\nClient: ${c.full_name}`);
    const clientId = await createUser(c.email, c.full_name, "client");
    await admin.from("profiles").update({ phone: c.phone }).eq("id", clientId);
    await admin.from("coach_clients").upsert({ coach_id: coachId, client_id: clientId, status: "active" });
    const progId = await seedProgram(coachId, clientId, c.program);
    console.log(`  program  → ${c.program.title}`);
    await seedMealPlan(coachId, clientId, c.mealPlan);
    console.log(`  meals    → ${c.mealPlan.title}`);
    await seedThread(coachId, clientId, c.messages);
    console.log(`  thread   → ${c.messages.length} viestiä  (program ${progId})`);
  }

  console.log("\n✓ Demo seed complete. Login (password: 'password'):");
  console.log("  Coach:   coach-demo@gainly.local");
  for (const c of CLIENTS) console.log(`  Client:  ${c.email}  (${c.full_name})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

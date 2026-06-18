// Seed 30 demo clients under coach-demo@gainly.local for local UI/UX testing
// at roster scale. Idempotent-ish: re-runs reuse existing users (deterministic
// emails) and skip clients that already have a program.
//
// Run: `npx tsx supabase/scripts/seed-many-clients.ts`
// Service role key: local CLI default, or export SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";

const LOCAL_DEFAULT_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_DEFAULT_SERVICE_ROLE_KEY;
const COACH_EMAIL = "coach-demo@gainly.local";

const admin = createClient(url, key, { auth: { persistSession: false } });

const FIRST = ["Aino","Eeli","Veera","Onni","Sofia","Leevi","Emma","Niilo","Helmi","Elias","Iida","Väinö","Aada","Joel","Lilja","Eino","Venla","Otto","Sara","Leo","Pihla","Aaro","Nea","Toivo","Ella","Akseli","Kerttu","Daniel","Vilma","Hugo"];
const LAST = ["Korhonen","Virtanen","Mäkinen","Nieminen","Mäkelä","Hämäläinen","Laine","Heikkinen","Koskinen","Järvinen","Lehtonen","Lehtinen","Saarinen","Salminen","Heinonen","Niemi","Heikkilä","Kinnunen","Salonen","Turunen","Salo","Laitinen","Tuominen","Rantanen","Karjalainen","Jokinen","Mattila","Savolainen","Lahtinen","Ahonen"];
const DAY_NAMES = ["Jalkapäivä","Ylävartalo","Työntö","Veto","Koko keho","Hartiat & kädet","Selkä & hauis","Rinta & ojentaja"];

async function ensureUser(email: string, full_name: string, role: "coach" | "client"): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "password", email_confirm: true,
    user_metadata: { role, full_name },
  });
  if (error && !/already/i.test(error.message)) throw error;
  if (data?.user) return data.user.id;
  // Already existed — find by paging (local instance is small).
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = list.users.find((u) => u.email === email);
  if (!found) throw new Error(`could not resolve user ${email}`);
  return found.id;
}

async function main() {
  const coachId = await ensureUser(COACH_EMAIL, "Demo Valmentaja", "coach");
  console.log(`Coach ${COACH_EMAIL} → ${coachId}`);

  for (let i = 0; i < 30; i++) {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[i % LAST.length]!;
    const name = `${first} ${last}`;
    const email = `demo-client-${String(i + 1).padStart(2, "0")}@gainly.local`;
    const clientId = await ensureUser(email, name, "client");

    // ~1 in 9 still pending (waiting to accept); rest active.
    const status = i % 9 === 8 ? "pending" : "active";
    await admin.from("coach_clients").upsert(
      { coach_id: coachId, client_id: clientId, status },
      { onConflict: "coach_id,client_id" },
    );

    // Skip program seeding if this client already has one (idempotent re-runs).
    const { data: existing } = await admin.from("programs").select("id").eq("client_id", clientId).limit(1);
    if (existing && existing.length > 0) {
      console.log(`~ ${name} (${status}) — program exists, skip`);
      continue;
    }

    // Vary remaining-workout count 0..5 so cards show the full health spread
    // (red = 0-1, amber = 2-3, green = 4+).
    const pending = i % 6;
    const { data: prog, error: progErr } = await admin.from("programs").insert({
      coach_id: coachId, client_id: clientId, title: "Harjoitusohjelma",
    }).select("id").single();
    if (progErr || !prog) throw new Error(`program insert failed: ${progErr?.message ?? "no row"}`);

    const { data: week, error: weekErr } = await admin.from("program_weeks").insert({
      program_id: prog.id, week_number: 1, is_active: true,
    }).select("id").single();
    if (weekErr || !week) throw new Error(`week insert failed: ${weekErr?.message ?? "no row"}`);

    for (let d = 0; d < pending; d++) {
      const { data: day, error: dayErr } = await admin.from("program_days").insert({
        week_id: week.id, day_number: d + 1, name: DAY_NAMES[d % DAY_NAMES.length],
      }).select("id").single();
      if (dayErr || !day) throw new Error(`day insert failed: ${dayErr?.message ?? "no row"}`);
      const { error: swErr } = await admin.from("scheduled_workouts").insert({
        program_id: prog.id, day_id: day.id, client_id: clientId, status: "pending",
      });
      if (swErr) throw new Error(`scheduled_workout insert failed: ${swErr.message}`);
    }

    console.log(`+ ${name} (${status}) — ${pending} pending`);
  }

  console.log("\nDone. Log in as", COACH_EMAIL, "(password: password) → /coach/clients");
}

main().catch((e) => { console.error(e); process.exit(1); });

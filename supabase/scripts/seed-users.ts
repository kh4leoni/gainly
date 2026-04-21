// Seed auth users for local dev.
// Run: `npx tsx supabase/scripts/seed-users.ts`
//
// The service role key is the well-known default shipped with Supabase CLI's
// local stack. If you rotated it, export SUPABASE_SERVICE_ROLE_KEY before running.
// Get the current value with:  npx supabase status -o env

import { createClient } from "@supabase/supabase-js";

const LOCAL_DEFAULT_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_DEFAULT_SERVICE_ROLE_KEY;

if (!/^eyJ/.test(key)) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY does not look like a JWT.\n" +
      "Run `npx supabase status` and copy the 'service_role key' value,\n" +
      "then: export SUPABASE_SERVICE_ROLE_KEY=...\n"
  );
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const users = [
  { email: "coach@gainly.local",   role: "coach",  full_name: "Coach Cory"  },
  { email: "client1@gainly.local", role: "client", full_name: "Alex Client" },
  { email: "client2@gainly.local", role: "client", full_name: "Sam Client"  },
];

async function main() {
  const ids: Record<string, string> = {};
  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: "password",
      email_confirm: true,
      user_metadata: { role: u.role, full_name: u.full_name },
    });
    if (error && !error.message.includes("already")) throw error;
    const user = data?.user ?? (await admin.auth.admin.listUsers()).data.users.find(x => x.email === u.email);
    if (!user) throw new Error(`failed to find ${u.email}`);
    ids[u.email] = user.id;
    console.log(`OK ${u.email} → ${user.id}`);
  }

  // Link coach ↔ clients
  await admin.from("coach_clients").upsert([
    { coach_id: ids["coach@gainly.local"], client_id: ids["client1@gainly.local"], status: "active" },
    { coach_id: ids["coach@gainly.local"], client_id: ids["client2@gainly.local"], status: "active" },
  ]);

  // Sample program for client1
  const { data: prog } = await admin.from("programs").insert({
    coach_id: ids["coach@gainly.local"],
    client_id: ids["client1@gainly.local"],
    title: "Starter Strength (4 wk)",
    description: "Linear progression full body.",
  }).select().single();

  if (!prog) throw new Error("program insert failed");

  const { data: week } = await admin.from("program_weeks").insert({
    program_id: prog.id, week_number: 1,
  }).select().single();

  const { data: day } = await admin.from("program_days").insert({
    week_id: week!.id, day_number: 1, name: "Day A",
  }).select().single();

  await admin.from("program_exercises").insert([
    { day_id: day!.id, exercise_id: "00000000-0000-0000-0000-000000000001", order_idx: 0, sets: 5, reps: "5",   intensity_type: "kg", intensity: 80, rest_sec: 180 },
    { day_id: day!.id, exercise_id: "00000000-0000-0000-0000-000000000002", order_idx: 1, sets: 5, reps: "5",   intensity_type: "kg", intensity: 60, rest_sec: 180 },
    { day_id: day!.id, exercise_id: "00000000-0000-0000-0000-000000000003", order_idx: 2, sets: 1, reps: "5",   intensity_type: "kg", intensity: 100, rest_sec: 180 },
  ]);

  // Create thread
  await admin.from("threads").upsert({
    coach_id: ids["coach@gainly.local"],
    client_id: ids["client1@gainly.local"],
  }, { onConflict: "coach_id,client_id" });

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

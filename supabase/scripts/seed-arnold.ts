// Seed an Arnold Golden Six (4 wk × 4 days) program for testing the v2 editor.
// Marks weeks 1–2 as fully completed, week 3 day 1 done, week 3 day 2 = today,
// rest planned. Realistic set_logs with slight overshoot vs. planned.
//
// Run: `npx tsx supabase/scripts/seed-arnold.ts`
// Requires: local Supabase running + seed-users.ts already executed.

import { createClient } from "@supabase/supabase-js";

const LOCAL_DEFAULT_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_DEFAULT_SERVICE_ROLE_KEY;

const admin = createClient(url, key, { auth: { persistSession: false } });

// Arnold's Golden Six — exercises looked up by name in the coach's own bank
// (per-coach exercise isolation since 20260428000000_per_coach_exercise_bank).
type ExTemplate = { name: string; baseW: number; reps: number; rpe: number };
const EX_TEMPLATES: ExTemplate[] = [
  { name: "Takakyykky",         baseW: 100, reps: 8,  rpe: 8 },
  { name: "Penkkipunnerrus",    baseW: 70,  reps: 8,  rpe: 8 },
  { name: "Leuanveto",          baseW: 0,   reps: 8,  rpe: 8 },
  { name: "Pystypunnerrus",     baseW: 45,  reps: 8,  rpe: 8 },
  { name: "Tangolla hauiskääntö", baseW: 30, reps: 10, rpe: 8 },
  { name: "Vatsarutistus",      baseW: 0,   reps: 15, rpe: 7 },
];

const WEEKS = [
  { num: 1, name: "Pohja" },
  { num: 2, name: "Volyymi" },
  { num: 3, name: "Intensiteetti" },
  { num: 4, name: "Testi" },
];
const ACTIVE_WEEK = 3;

const DAYS = [
  { num: 1, name: "Treeni A" },
  { num: 2, name: "Treeni B" },
  { num: 3, name: "Treeni C" },
  { num: 4, name: "Treeni D" },
];

// Completion plan: which (week, day) is "done", and which day (if any) is today.
const TODAY = new Date().toISOString().slice(0, 10);
function planStatus(weekNum: number, dayNum: number): {
  status: "completed" | "pending";
  scheduled_date: string | null;
  completed_at: string | null;
  overshoot: number; // kg overshoot vs planned
} {
  if (weekNum === 1 || weekNum === 2) {
    // Past weeks: all done. Backdate completed_at to spread over past 2 weeks.
    const offset = (3 - weekNum) * 7 + (5 - dayNum);
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return {
      status: "completed",
      scheduled_date: d.toISOString().slice(0, 10),
      completed_at: d.toISOString(),
      overshoot: 2.5,
    };
  }
  if (weekNum === 3 && dayNum === 1) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return {
      status: "completed",
      scheduled_date: d.toISOString().slice(0, 10),
      completed_at: d.toISOString(),
      overshoot: 2.5,
    };
  }
  if (weekNum === 3 && dayNum === 2) {
    return { status: "pending", scheduled_date: TODAY, completed_at: null, overshoot: 0 };
  }
  return { status: "pending", scheduled_date: null, completed_at: null, overshoot: 0 };
}

function progressionFactor(weekNum: number) {
  return 1 + (weekNum - 1) * 0.025;
}

async function main() {
  // Find coach + client1
  const { data: usersRes } = await admin.auth.admin.listUsers();
  const users = usersRes?.users ?? [];
  const coach = users.find((u) => u.email === "coach@gainly.local");
  const client = users.find((u) => u.email === "client1@gainly.local");
  if (!coach || !client) {
    console.error("Missing coach@gainly.local or client1@gainly.local. Run seed-users.ts first.");
    process.exit(1);
  }

  // Resolve coach-owned exercise IDs by name (per-coach exercise bank).
  const { data: coachEx, error: exErr } = await admin
    .from("exercises")
    .select("id, name")
    .eq("created_by", coach.id)
    .in("name", EX_TEMPLATES.map((e) => e.name));
  if (exErr) throw exErr;
  type ResolvedEx = ExTemplate & { id: string };
  const exByName = new Map((coachEx ?? []).map((e: { id: string; name: string }) => [e.name, e.id] as const));
  const missing = EX_TEMPLATES.filter((t) => !exByName.has(t.name));
  if (missing.length > 0) {
    console.error(`Coach is missing these exercises: ${missing.map((m) => m.name).join(", ")}`);
    console.error("Make sure the per-coach exercise bank trigger has run (it copies globals on coach profile creation).");
    process.exit(1);
  }
  const EXERCISES: ResolvedEx[] = EX_TEMPLATES.map((t) => ({ ...t, id: exByName.get(t.name)! }));

  // Clean up any prior Arnold seed for this client (idempotent)
  const { data: existing } = await admin
    .from("programs")
    .select("id")
    .eq("client_id", client.id)
    .eq("title", "Arnold Golden Six (4 vk)");
  if (existing && existing.length > 0) {
    for (const p of existing) {
      await admin.from("programs").delete().eq("id", p.id);
    }
    console.log(`Removed ${existing.length} prior Arnold program(s).`);
  }

  // Create program
  const { data: prog, error: progErr } = await admin
    .from("programs")
    .insert({
      coach_id: coach.id,
      client_id: client.id,
      title: "Arnold Golden Six (4 vk)",
      description: "Klassinen Arnoldin Golden Six täysikropalla. 4 viikkoa, 4 treeniä/vk.",
    })
    .select("id")
    .single();
  if (progErr || !prog) throw progErr ?? new Error("program insert failed");
  console.log(`Program ${prog.id} created.`);

  // Block
  const { data: block, error: blockErr } = await admin
    .from("program_blocks")
    .insert({ program_id: prog.id, block_number: 1, name: "Akkumulaatio" })
    .select("id")
    .single();
  if (blockErr || !block) throw blockErr ?? new Error("block insert failed");

  // For each week → days → exercises
  for (const wk of WEEKS) {
    const { data: week, error: weekErr } = await admin
      .from("program_weeks")
      .insert({
        program_id: prog.id,
        block_id: block.id,
        week_number: wk.num,
        name: wk.name,
        is_active: wk.num === ACTIVE_WEEK,
      })
      .select("id")
      .single();
    if (weekErr || !week) throw weekErr ?? new Error("week insert failed");

    for (const dy of DAYS) {
      const { data: day, error: dayErr } = await admin
        .from("program_days")
        .insert({ week_id: week.id, day_number: dy.num, name: dy.name })
        .select("id")
        .single();
      if (dayErr || !day) throw dayErr ?? new Error("day insert failed");

      // Insert exercises with set_configs
      const peRows: Array<{ id: string; exercise_id: string }> = [];
      for (let i = 0; i < EXERCISES.length; i++) {
        const ex = EXERCISES[i]!;
        const factor = progressionFactor(wk.num);
        const w = ex.baseW > 0 ? Math.round(ex.baseW * factor * 2) / 2 : 0;
        const sets = 4;
        const set_configs = Array.from({ length: sets }, (_, si) => ({
          reps: String(ex.reps),
          weight: w || null,
          rpe: si < 2 ? ex.rpe - 1 : ex.rpe,
        }));
        const { data: pe, error: peErr } = await admin
          .from("program_exercises")
          .insert({
            day_id: day.id,
            exercise_id: ex.id,
            order_idx: i,
            sets,
            reps: String(ex.reps),
            intensity: w || null,
            intensity_type: "kg",
            target_rpe: ex.rpe,
            set_configs,
            rest_sec: 120,
          })
          .select("id, exercise_id")
          .single();
        if (peErr || !pe) throw peErr ?? new Error("pe insert failed");
        peRows.push({ id: pe.id, exercise_id: pe.exercise_id! });
      }

      // Schedule the workout
      const plan = planStatus(wk.num, dy.num);
      const { data: sw, error: swErr } = await admin
        .from("scheduled_workouts")
        .insert({
          program_id: prog.id,
          day_id: day.id,
          client_id: client.id,
          status: plan.status,
          scheduled_date: plan.scheduled_date,
          completed_at: plan.completed_at,
        })
        .select("id")
        .single();
      if (swErr || !sw) throw swErr ?? new Error("scheduled_workout insert failed");

      // If completed, write workout_log + set_logs (slight overshoot)
      if (plan.status === "completed") {
        const { data: wl, error: wlErr } = await admin
          .from("workout_logs")
          .insert({
            client_id: client.id,
            scheduled_workout_id: sw.id,
            logged_at: plan.completed_at!,
          })
          .select("id")
          .single();
        if (wlErr || !wl) throw wlErr ?? new Error("workout_log insert failed");

        const logs: Array<Record<string, unknown>> = [];
        for (let i = 0; i < EXERCISES.length; i++) {
          const ex = EXERCISES[i]!;
          const pe = peRows[i]!;
          const factor = progressionFactor(wk.num);
          const w = ex.baseW > 0 ? Math.round(ex.baseW * factor * 2) / 2 : 0;
          for (let si = 0; si < 4; si++) {
            // Last set slightly fewer reps for variety
            const actualReps = si === 3 ? Math.max(ex.reps - 1, 1) : ex.reps;
            const actualW = w > 0 ? w + plan.overshoot : 0;
            const plannedRpe = si < 2 ? ex.rpe - 1 : ex.rpe;
            const actualRpe = Math.min(plannedRpe + 0.5, 10);
            logs.push({
              workout_log_id: wl.id,
              program_exercise_id: pe.id,
              exercise_id: pe.exercise_id,
              set_number: si + 1,
              reps: actualReps,
              weight: actualW || null,
              rpe: actualRpe,
            });
          }
        }
        const { error: logErr } = await admin.from("set_logs").insert(logs);
        if (logErr) throw logErr;
      }
    }
    console.log(`Wk ${wk.num} (${wk.name}) seeded.`);
  }

  console.log("\nDone. Program:");
  console.log(`  /coach/client-programs/${prog.id}/edit`);
  console.log(`  /coach/client-programs/${prog.id}/edit-v2`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

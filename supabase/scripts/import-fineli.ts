// Import Fineli open data into the `foods` table.
//
//   1. Download the Fineli open data zip (CSV) from
//      https://fineli.fi/fineli/en/avoin-data  (file "Fineli_Rel*.zip").
//   2. Extract the CSV files into  supabase/scripts/fineli-data/
//   3. Run:  npx tsx supabase/scripts/import-fineli.ts
//
// Uses the local service-role key by default (bypasses RLS). To target a
// remote project: export SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.
//
// Data © THL / Fineli, licensed CC BY 4.0. The app must show attribution.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.FINELI_DATA_DIR ?? join(HERE, "fineli-data");

const LOCAL_DEFAULT_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_DEFAULT_SERVICE_ROLE_KEY;

// Fineli component codes → our columns. ENERC is energy in kJ.
const COMPONENTS = {
  ENERC: "energy_kj",
  PROT: "protein_g",
  FAT: "fat_g",
  CHOAVL: "carb_g",
  FIBC: "fiber_g",
  SUGAR: "sugar_g",
} as const;

type FoodRow = {
  id: number;
  name_fi: string;
  name_en: string | null;
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carb_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
};

// Fineli CSVs are semicolon-delimited; decimals use a comma. Quoting is
// minimal, but handle it defensively.
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ";" && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]!).map((h) => h.trim().toUpperCase());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function num(s: string | undefined): number | null {
  if (!s) return null;
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

function read(...names: string[]): Record<string, string>[] | null {
  for (const n of names) {
    const p = join(DATA_DIR, n);
    // Fineli open data CSVs are ISO-8859-1 (Latin-1): "Ä" is a single 0xC4
    // byte, not the UTF-8 0xC3 0x84. Reading as utf-8 mangles ä/ö.
    if (existsSync(p)) return parseCsv(readFileSync(p, "latin1"));
  }
  return null;
}

function main() {
  if (!existsSync(DATA_DIR)) {
    console.error(`Fineli data dir not found: ${DATA_DIR}\nExtract the open data CSVs there first (see header comment).`);
    process.exit(1);
  }

  // Finnish names: prefer foodname_FI.csv, fall back to FOODNAME in food.csv.
  const foodFi = read("foodname_FI.csv", "foodname_FI.txt");
  const food = read("food.csv", "food.txt");
  if (!food && !foodFi) {
    console.error("Neither food.csv nor foodname_FI.csv found in data dir.");
    process.exit(1);
  }

  const names = new Map<number, { fi: string; en: string | null }>();
  for (const r of foodFi ?? food ?? []) {
    const id = Number(r.FOODID);
    if (!Number.isFinite(id)) continue;
    names.set(id, { fi: r.FOODNAME ?? "", en: null });
  }
  // If we used food.csv for ids but it lacked FOODNAME, still ensure entries exist.
  if (food) {
    for (const r of food) {
      const id = Number(r.FOODID);
      if (!Number.isFinite(id)) continue;
      if (!names.has(id)) names.set(id, { fi: r.FOODNAME ?? "", en: null });
      else if (!names.get(id)!.fi && r.FOODNAME) names.get(id)!.fi = r.FOODNAME;
    }
  }

  const foodEn = read("foodname_EN.csv", "foodname_EN.txt");
  for (const r of foodEn ?? []) {
    const id = Number(r.FOODID);
    const entry = names.get(id);
    if (entry && r.FOODNAME) entry.en = r.FOODNAME;
  }

  // Nutrient values, keyed by FOODID.
  const values = read("component_value.csv", "component_value.txt");
  if (!values) {
    console.error("component_value.csv not found in data dir.");
    process.exit(1);
  }
  const nutrients = new Map<number, Record<string, number | null>>();
  for (const r of values) {
    const id = Number(r.FOODID);
    const code = (r.EUFDNAME ?? "").toUpperCase();
    const col = COMPONENTS[code as keyof typeof COMPONENTS];
    if (!Number.isFinite(id) || !col) continue;
    const v = num(r.BESTLOC ?? r.VALUE);
    if (!nutrients.has(id)) nutrients.set(id, {});
    nutrients.get(id)![col] = v;
  }

  const rows: FoodRow[] = [];
  for (const [id, name] of names) {
    if (!name.fi) continue;
    const n = nutrients.get(id) ?? {};
    const kj = n.energy_kj;
    rows.push({
      id,
      name_fi: name.fi,
      name_en: name.en,
      energy_kcal: kj == null ? null : Math.round((kj / 4.184) * 10) / 10,
      protein_g: n.protein_g ?? null,
      fat_g: n.fat_g ?? null,
      carb_g: n.carb_g ?? null,
      fiber_g: n.fiber_g ?? null,
      sugar_g: n.sugar_g ?? null,
    });
  }

  console.log(`Parsed ${rows.length} foods. Upserting…`);
  void upload(rows);
}

async function upload(rows: FoodRow[]) {
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await admin.from("foods").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Batch ${i}–${i + chunk.length} failed:`, error.message);
      process.exit(1);
    }
    console.log(`  upserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log("Fineli import complete.");
}

main();

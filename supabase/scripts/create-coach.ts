// Create a coach account in production (or any Supabase instance).
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   npx tsx supabase/scripts/create-coach.ts <email> <full_name> <password>

import { createClient } from "@supabase/supabase-js";

const [email, full_name, password] = process.argv.slice(2);

if (!email || !full_name || !password) {
  console.error("Usage: npx tsx create-coach.ts <email> <full_name> <password>");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "coach", full_name },
  });

  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }

  console.log(`Coach created: ${email} → ${data.user.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

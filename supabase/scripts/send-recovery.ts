// Send a password recovery email with the correct redirectTo.
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   npx tsx supabase/scripts/send-recovery.ts <email>

import { createClient } from "@supabase/supabase-js";

const [email] = process.argv.slice(2);

if (!email) {
  console.error("Usage: npx tsx send-recovery.ts <email>");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gainly-lilac.vercel.app";

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/update-password`,
  });

  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }

  console.log(`Recovery email sent to ${email}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

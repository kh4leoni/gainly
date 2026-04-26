"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function inviteClient(coachId: string, email: string, name?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== coachId) throw new Error("Unauthorized");

  const serviceClient = createServiceClient();
  // Hardcoded production URL — env var was unreliable.
  const siteUrl = "https://gainly-lilac.vercel.app";
  const redirectTo = `${siteUrl}/auth/callback`;
  console.log("[inviteClient] redirectTo:", redirectTo, "envSiteUrl:", process.env.NEXT_PUBLIC_SITE_URL);

  // Check if user already exists
  const { data: listData } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const foundUser = listData?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;

  if (foundUser) {
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", foundUser.id)
      .single();

    if (profile?.role && profile.role !== "client") {
      throw new Error("That email belongs to a coach account");
    }

    const { error } = await serviceClient
      .from("coach_clients")
      .insert({ coach_id: coachId, client_id: foundUser.id, status: "active" });
    if (error && !error.message.includes("duplicate")) throw error;

    if (!foundUser.email_confirmed_at) {
      await serviceClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { role: "client", full_name: name ?? "" },
      });
      return { type: "invited" as const };
    }

    return { type: "linked" as const };
  }

  // New user — invite via Supabase, link to coach immediately using returned user id
  const { data: inviteData, error: inviteErr } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { role: "client", full_name: name ?? "" },
  });
  if (inviteErr) throw inviteErr;

  const newUserId = inviteData.user.id;

  const { error: linkErr } = await serviceClient
    .from("coach_clients")
    .insert({ coach_id: coachId, client_id: newUserId, status: "active" });
  if (linkErr && !linkErr.message.includes("duplicate")) throw linkErr;

  return { type: "invited" as const };
}

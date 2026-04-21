"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function inviteClient(coachId: string, email: string, name?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== coachId) throw new Error("Unauthorized");

  const serviceClient = createServiceClient();

  // Check if user already exists — admin API has no getUserByEmail; use listUsers with filter
  const { data: listData } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const foundUser = listData?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;

  if (foundUser) {
    // Get their profile role
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", foundUser.id)
      .single();

    if (profile?.role && profile.role !== "client") {
      throw new Error("That email belongs to a coach account");
    }

    // Link directly
    const { error } = await serviceClient
      .from("coach_clients")
      .insert({ coach_id: coachId, client_id: foundUser.id, status: "active" });
    if (error && !error.message.includes("duplicate")) throw error;

    return { type: "linked" as const };
  }

  // New user — create invitation row then send invite email
  const { data: inv, error: invErr } = await supabase
    .from("invitations")
    .insert({ coach_id: coachId, email, invited_name: name ?? null })
    .select("token")
    .single();
  if (invErr) throw invErr;

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/accept?token=${inv.token}`;

  const { error: emailErr } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { role: "client", full_name: name ?? "" },
  });
  if (emailErr) throw emailErr;

  return { type: "invited" as const };
}

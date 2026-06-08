"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function inviteClient(coachId: string, email: string, name?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== coachId) throw new Error("Unauthorized");

  const serviceClient = createServiceClient();
  const siteUrl = "https://gainly-lilac.vercel.app";

  // 1. Always insert an invitations row. coach_clients is never written
  //    here — only accept_invitation (SECURITY DEFINER) creates that link
  //    after the invitee proves ownership of the email.
  const { data: inv, error: invErr } = await serviceClient
    .from("invitations")
    .upsert(
      { coach_id: coachId, email: email.toLowerCase(), invited_name: name ?? null, status: "pending" },
      { onConflict: "coach_id,email" }
    )
    .select("token")
    .single();
  if (invErr || !inv) throw invErr ?? new Error("Failed to create invitation");

  // 2. Send the Supabase invite email only if the email isn't already a
  //    Gainly user. For existing users, the pending invitation surfaces
  //    via the dashboard banner on their next login.
  const { data: alreadyUser, error: existsErr } = await serviceClient.rpc(
    "email_user_exists",
    { _email: email }
  );
  if (existsErr) throw existsErr;

  if (alreadyUser === true) {
    return { type: "linked" as const };
  }

  // After password setup the user lands on /client/dashboard, which renders
  // a banner listing pending invitations (rendered from my_pending_invitations).
  const redirectTo = `${siteUrl}/auth/callback`;
  const { error: inviteErr } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: name ?? "" },
  });
  if (inviteErr) throw inviteErr;

  return { type: "invited" as const };
}

export async function revokeInvitation(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // RLS ("coach deletes own invitations") scopes this to the caller's
  // own rows, so no service client and no extra coach_id filter needed.
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) throw error;
}

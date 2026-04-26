import { createClient } from "@/lib/supabase/server";
import { getMe, getMyCoach } from "@/lib/queries/profile";
import { ClientShell } from "@/components/client/client-shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [me, coachName] = await Promise.all([getMe(supabase), getMyCoach(supabase)]);
  return <ClientShell me={me} coachName={coachName}>{children}</ClientShell>;
}

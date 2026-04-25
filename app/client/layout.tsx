import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/queries/profile";
import { ClientShell } from "@/components/client/client-shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const me = await getMe(supabase);
  return <ClientShell me={me}>{children}</ClientShell>;
}

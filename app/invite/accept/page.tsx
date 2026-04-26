import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-destructive">Virheellinen tai vanhentunut kutsulinkki.</p>
        </div>
      );
    }
  }

  redirect("/client/dashboard");
}

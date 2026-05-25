import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; token?: string }>;
}) {
  const { code, token } = await searchParams;
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-destructive">Virheellinen tai vanhentunut kutsulinkki.</p>
        </div>
      );
    }
  }

  if (token) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/login?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
    }
    const { error } = await supabase.rpc("accept_invitation", { _token: token });
    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-destructive">Kutsua ei voitu hyväksyä: {error.message}</p>
        </div>
      );
    }
  }

  redirect("/client/dashboard");
}

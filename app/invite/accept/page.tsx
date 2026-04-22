import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; code?: string }>;
}) {
  const { token, code } = await searchParams;

  if (!code || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive">Virheellinen tai vanhentunut kutsulinkki.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive">Istuntoa ei voitu vahvistaa: {sessionError.message}</p>
      </div>
    );
  }

  const { error: rpcError } = await supabase.rpc("accept_invitation", { _token: token });
  if (rpcError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive">Virheellinen tai vanhentunut kutsu.</p>
      </div>
    );
  }

  redirect("/client/dashboard");
}

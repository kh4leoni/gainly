import { getMeCached, getMyCoachCached } from "@/lib/queries/profile.server";
import { ClientShell } from "@/components/client/client-shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const [me, coachName] = await Promise.all([getMeCached(), getMyCoachCached()]);
  return <ClientShell me={me} coachName={coachName}>{children}</ClientShell>;
}

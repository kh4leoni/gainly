import { getMeCached, getMyCoachCached, getMyBodyweightHistoryCached, getMyWaistHistoryCached } from "@/lib/queries/profile.server";
import { ClientShell } from "@/components/client/client-shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const [me, coach, bwHistory, waistHistory] = await Promise.all([
    getMeCached(),
    getMyCoachCached(),
    getMyBodyweightHistoryCached(),
    getMyWaistHistoryCached(),
  ]);
  return (
    <ClientShell me={me} coach={coach} bwHistory={bwHistory} waistHistory={waistHistory}>
      {children}
    </ClientShell>
  );
}

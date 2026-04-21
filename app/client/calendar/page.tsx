import { createClient } from "@/lib/supabase/server";
import { getMonthWorkouts } from "@/lib/queries/workouts";
import { CalendarView } from "@/components/client/calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.y ?? now.getFullYear());
  const month = Number(sp.m ?? now.getMonth() + 1);

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const clientId = user.user?.id ?? "";
  const initial = clientId ? await getMonthWorkouts(supabase, clientId, year, month) : [];

  return <CalendarView year={year} month={month} initial={initial} clientId={clientId} />;
}

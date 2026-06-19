import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getMyBodyweightHistoryCached, getMyWaistHistoryCached } from "@/lib/queries/profile.server";
import { ProgressView } from "@/components/client/progress-view";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();

  const [exerciseIdRows, bwHistory, waistHistory, compRes] = await Promise.all([
    supabase.from("set_logs").select("exercise_id").eq("client_id", user.id).limit(500),
    getMyBodyweightHistoryCached(),
    getMyWaistHistoryCached(),
    supabase.from("profiles")
      .select("comp_squat_exercise_id, comp_bench_exercise_id, comp_dead_exercise_id")
      .eq("id", user.id).single(),
  ]);

  const compSelection = {
    squat: compRes.data?.comp_squat_exercise_id ?? null,
    bench: compRes.data?.comp_bench_exercise_id ?? null,
    dead: compRes.data?.comp_dead_exercise_id ?? null,
  };

  const uniqueIds = [...new Set((exerciseIdRows.data ?? []).map((r) => r.exercise_id).filter(Boolean))] as string[];

  const { data: exerciseRows } = uniqueIds.length > 0
    ? await supabase.from("exercises").select("id, name").in("id", uniqueIds).order("name")
    : { data: [] as { id: string; name: string }[] };

  return (
    <ProgressView
      clientId={user.id}
      exercises={exerciseRows ?? []}
      compSelection={compSelection}
      bwHistory={bwHistory}
      waistHistory={waistHistory}
    />
  );
}

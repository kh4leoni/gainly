import { createClient } from "@/lib/supabase/server";
import { ProgressView } from "@/components/client/progress-view";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  // Step 1: lightweight — only UUIDs, no join
  const { data: exerciseIdRows } = await supabase
    .from("set_logs")
    .select("exercise_id")
    .eq("client_id", user.user.id)
    .limit(500);

  const uniqueIds = [...new Set((exerciseIdRows ?? []).map((r) => r.exercise_id).filter(Boolean))] as string[];

  // Step 2: fetch names only for exercises actually logged
  const { data: exerciseRows } = uniqueIds.length > 0
    ? await supabase
        .from("exercises")
        .select("id, name")
        .in("id", uniqueIds)
        .order("name")
    : { data: [] as { id: string; name: string }[] };

  const exercises = exerciseRows ?? [];

  return <ProgressView clientId={user.user.id} exercises={exercises} />;
}

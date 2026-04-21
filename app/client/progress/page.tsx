import { createClient } from "@/lib/supabase/server";
import { ProgressView } from "@/components/client/progress-view";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  // Get exercises the client has actually logged (limit to handful).
  const { data: exList } = await supabase
    .from("set_logs")
    .select("exercise_id, exercises(id, name)")
    .limit(500);
  const seen = new Map<string, { id: string; name: string }>();
  for (const row of exList ?? []) {
    const ex = (row as any).exercises;
    if (ex && !seen.has(ex.id)) seen.set(ex.id, ex);
  }
  const exercises = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

  return <ProgressView clientId={user.user.id} exercises={exercises} />;
}

import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getProgramFull } from "@/lib/queries/programs";
import { getExercises } from "@/lib/queries/exercises";
import { ProgramEditor } from "@/components/program-builder/program-editor";

export const dynamic = "force-dynamic";

export default async function ClientProgramEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("id, client_id, is_template")
    .eq("id", id)
    .single();

  if (!program || program.is_template || !program.client_id) {
    notFound();
  }

  const qc = getQueryClient();
  await Promise.all([
    qc.prefetchQuery({ queryKey: ["program", id], queryFn: () => getProgramFull(supabase, id) }),
    qc.prefetchQuery({ queryKey: ["exercises"], queryFn: () => getExercises(supabase) }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ProgramEditor programId={id} />
    </HydrationBoundary>
  );
}

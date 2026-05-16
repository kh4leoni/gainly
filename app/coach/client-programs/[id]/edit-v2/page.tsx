import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getProgramFull, getProgramCompletion } from "@/lib/queries/programs";
import { getExercises } from "@/lib/queries/exercises";
import { ProgramEditorV2 } from "@/components/program-builder/program-editor-v2";

export const dynamic = "force-dynamic";

export default async function ClientProgramEditV2Page({
  params,
}: { params: Promise<{ id: string }> }) {
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

  const clientId = program.client_id;
  const qc = getQueryClient();
  await Promise.all([
    qc.prefetchQuery({
      queryKey: ["program", id],
      queryFn: () => getProgramFull(supabase, id),
    }),
    qc.prefetchQuery({
      queryKey: ["exercises"],
      queryFn: () => getExercises(supabase),
    }),
    qc.prefetchQuery({
      queryKey: ["program-completion", id],
      queryFn: () => getProgramCompletion(supabase, id, clientId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ProgramEditorV2 programId={id} clientId={clientId} />
    </HydrationBoundary>
  );
}

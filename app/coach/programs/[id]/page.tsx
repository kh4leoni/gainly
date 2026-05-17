import { notFound } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getQueryClient } from "@/lib/get-query-client";
import { getProgramFull } from "@/lib/queries/programs";
import { ProgramViewer } from "@/components/programs/program-viewer";

export const dynamic = "force-dynamic";

export default async function ProgramViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("id, client_id")
    .eq("id", id)
    .single();

  if (!program) notFound();

  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: ["program", id],
    queryFn: () => getProgramFull(supabase, id),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ProgramViewer programId={id} isTemplate={program.client_id === null} />
    </HydrationBoundary>
  );
}

import { createClient } from "@/lib/supabase/server";
import { NewProgramButton } from "@/components/program-builder/new-program-button";
import { ProgramsList } from "@/components/programs/programs-list";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data } = await supabase
    .from("programs")
    .select("id, title, description")
    .eq("coach_id", user.user.id)
    .eq("is_template", true)
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ohjelmat</h1>
        <NewProgramButton />
      </div>
      <div className="mt-4 mb-6 rounded-lg border bg-muted/40 p-4">
        <h2 className="text-base font-medium">Malliohjelmat</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nämä ohjelmat on tarkoitettu itsenäisesti ostettaviksi. Coach-asiakkaille luodaan henkilökohtaiset ohjelmat asiakassivulta.
        </p>
      </div>
      <ProgramsList programs={data ?? []} />
    </div>
  );
}

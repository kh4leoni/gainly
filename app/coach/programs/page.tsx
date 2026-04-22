import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewProgramButton } from "@/components/program-builder/new-program-button";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data } = await supabase
    .from("programs")
    .select("id, title, description, client_id, is_template, created_at, profiles:client_id(full_name)")
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
        <h2 className="text-base font-medium">Malliportaat</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nämä ohjelmat on tarkoitettu itsenäisesti ostettaviksi. Coach-asiakkaille luodaan henkilökohtaiset ohjelmat asiakassivulta.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p: any) => (
          <Link key={p.id} href={`/coach/programs/${p.id}/edit`} prefetch>
            <Card className="transition hover:border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                {p.is_template ? (
                  <Badge variant="outline">Malli</Badge>
                ) : (
                  <Badge variant="secondary">Asiakkaalle {p.profiles?.full_name ?? ""}</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {data?.length === 0 && <p className="text-muted-foreground">Ei vielä ohjelmia.</p>}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getExercises, createExercise, updateExercise } from "@/lib/queries/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const MUSCLE_GROUPS: Record<string, string> = {
  chest: "rinta",
  back: "selkä",
  shoulders: "olkapäät",
  biceps: "hauis",
  triceps: "ojentajat",
  quadriceps: "etureisi",
  quads: "etureisi",
  hamstrings: "takareisi",
  glutes: "pakarat",
  calves: "pohkeet",
  abs: "vatsalihakset",
  forearms: "kyynärvarret",
  core: "keskivartalo",
  full_body: "koko keho",
  adductors: "lähentäjät",
  abductors: "loitontajat",
  traps: "trapetsi",
  obliques: "vinot vatsalihakset",
  "hip flexors": "lonkankoukistajat",
};

const MUSCLE_COLORS: Record<string, string> = {
  chest: "bg-rose-400",
  back: "bg-sky-400",
  shoulders: "bg-violet-400",
  biceps: "bg-amber-400",
  triceps: "bg-orange-400",
  quadriceps: "bg-green-400",
  quads: "bg-green-400",
  hamstrings: "bg-emerald-500",
  glutes: "bg-pink-400",
  calves: "bg-teal-400",
  abs: "bg-yellow-400",
  core: "bg-yellow-400",
  forearms: "bg-amber-300",
  traps: "bg-purple-400",
  adductors: "bg-lime-400",
  abductors: "bg-cyan-400",
  obliques: "bg-yellow-500",
  "hip flexors": "bg-indigo-400",
};

function translateMuscle(m: string) {
  return MUSCLE_GROUPS[m.toLowerCase()] ?? m;
}

function muscleColor(m: string) {
  return MUSCLE_COLORS[m.toLowerCase()] ?? "bg-slate-400";
}

function getEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\s?/]+)/);
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi?.[1]) return `https://player.vimeo.com/video/${vi[1]}`;
  return null;
}

type Exercise = {
  id: string;
  name: string;
  instructions: string | null;
  video_path: string | null;
  muscle_groups: string[];
  created_by: string | null;
};

export function ExerciseLibrary() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["exercises"], queryFn: () => getExercises(supabase) });

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cInstructions, setCInstructions] = useState("");
  const [cMuscleGroups, setCMuscleGroups] = useState("");
  const [cVideoUrl, setCVideoUrl] = useState("");

  // edit dialog
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const [eName, setEName] = useState("");
  const [eInstructions, setEInstructions] = useState("");
  const [eMuscleGroups, setEMuscleGroups] = useState("");
  const [eVideoUrl, setEVideoUrl] = useState("");

  // video preview dialog
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const filtered = search.trim()
    ? data.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : data;

  const create = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("not signed in");
      await createExercise(supabase, {
        created_by: user.user.id,
        name: cName,
        instructions: cInstructions || null,
        muscle_groups: cMuscleGroups.split(",").map((s) => s.trim()).filter(Boolean),
        video_path: cVideoUrl.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      setCreateOpen(false);
      setCName(""); setCInstructions(""); setCMuscleGroups(""); setCVideoUrl("");
      toast({ title: "Liike lisätty" });
    },
    onError: (e: any) => toast({ title: "Epäonnistui", description: e.message, variant: "destructive" }),
  });

  const edit = useMutation({
    mutationFn: async () => {
      if (!editExercise) return;
      await updateExercise(supabase, editExercise.id, {
        name: eName,
        instructions: eInstructions || null,
        video_path: eVideoUrl.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      setEditExercise(null);
      toast({ title: "Muutokset tallennettu" });
    },
    onError: (e: any) => toast({ title: "Epäonnistui", description: e.message, variant: "destructive" }),
  });

  function openEdit(e: Exercise) {
    setEditExercise(e);
    setEName(e.name);
    setEInstructions(e.instructions ?? "");
    setEMuscleGroups((e.muscle_groups ?? []).join(", "));
    setEVideoUrl(e.video_path ?? "");
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Liikkeet</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Lisää liike
        </Button>
      </div>

      <div className="mt-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hae liikkeitä…"
          className="h-10 w-full md:max-w-xs"
        />
      </div>

      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, 157px)", gridAutoRows: "82px" }}
      >
        {filtered.map((e) => {
          const isHovered = hoveredId === e.id;
          const embedUrl = getEmbedUrl(e.video_path);
          return (
            <div
              key={e.id}
              onMouseEnter={() => setHoveredId(e.id)}
              onMouseLeave={(ev) => {
                if (!ev.currentTarget.contains(ev.relatedTarget as Node)) setHoveredId(null);
              }}
              className="relative cursor-pointer select-none"
              onClick={() => openEdit(e)}
              style={{ zIndex: isHovered ? 50 : 1 }}
            >
              {/* compact — always occupies grid cell */}
              <div className="absolute inset-0 rounded-xl border bg-card p-2.5 flex flex-col justify-between">
                <p className="text-xs font-medium leading-tight line-clamp-2">{e.name}</p>
                <div className="flex gap-1">
                  {(e.muscle_groups ?? []).slice(0, 4).map((m) => (
                    <span key={m} className={`h-1.5 w-1.5 rounded-full ${muscleColor(m)}`} title={translateMuscle(m)} />
                  ))}
                </div>
              </div>

              {/* expanded — floats above, grows from center in all directions */}
              <div
                className="absolute rounded-xl border bg-card shadow-2xl p-3 flex flex-col gap-1.5 overflow-hidden"
                style={{
                  width: 208,
                  height: 135,
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) scale(${isHovered ? 1 : 0.92})`,
                  opacity: isHovered ? 1 : 0,
                  pointerEvents: isHovered ? "auto" : "none",
                  transition: "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 180ms ease",
                }}
              >
                {/* pink gradient overlay */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(236,72,153,0.13) 0%, rgba(251,207,232,0.07) 100%)",
                    opacity: isHovered ? 1 : 0,
                    transition: "opacity 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                />
                <div className="relative flex items-start justify-between gap-1">
                  <p className="text-sm font-semibold leading-tight flex-1">{e.name}</p>
                  {embedUrl && (
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); setVideoUrl(embedUrl); }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <Play className="h-3 w-3 text-primary" />
                    </button>
                  )}
                </div>
                <div className="h-px bg-border" />
                {e.instructions && (
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{e.instructions}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-1">
                  {(e.muscle_groups ?? []).map((m) => (
                    <Badge key={m} variant="outline" className="text-[9px] px-1 py-0 h-4">{translateMuscle(m)}</Badge>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lisää liike</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nimi</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} />
            </div>
            <div>
              <Label>Lihasryhmät (pilkulla erotettuna)</Label>
              <Input value={cMuscleGroups} onChange={(e) => setCMuscleGroups(e.target.value)} placeholder="chest, triceps" />
            </div>
            <div>
              <Label>Ohjeet</Label>
              <Textarea value={cInstructions} onChange={(e) => setCInstructions(e.target.value)} />
            </div>
            <div>
              <Label>Video URL (YouTube / Vimeo, valinnainen)</Label>
              <Input value={cVideoUrl} onChange={(e) => setCVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Peruuta</Button>
            <Button disabled={!cName || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Tallennetaan…" : "Tallenna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit dialog */}
      <Dialog open={!!editExercise} onOpenChange={(o) => { if (!o) setEditExercise(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Muokkaa liikettä</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nimi</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div>
              <Label>Lihasryhmät (pilkulla erotettuna)</Label>
              <Input value={eMuscleGroups} onChange={(e) => setEMuscleGroups(e.target.value)} placeholder="chest, triceps" />
            </div>
            <div>
              <Label>Ohjeet</Label>
              <Textarea value={eInstructions} onChange={(e) => setEInstructions(e.target.value)} />
            </div>
            <div>
              <Label>Video URL (YouTube / Vimeo, valinnainen)</Label>
              <Input value={eVideoUrl} onChange={(e) => setEVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExercise(null)}>Peruuta</Button>
            <Button disabled={!eName || edit.isPending} onClick={() => edit.mutate()}>
              {edit.isPending ? "Tallennetaan…" : "Tallenna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* video embed dialog */}
      <Dialog open={!!videoUrl} onOpenChange={(o) => { if (!o) setVideoUrl(null); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="aspect-video w-full">
            {videoUrl && (
              <iframe
                src={videoUrl}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

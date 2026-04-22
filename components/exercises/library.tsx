"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getExercises, createExercise, updateExercise } from "@/lib/queries/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Play, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const MUSCLE_GROUPS: Record<string, string> = {
  chest: "Rintalihakset",
  lats: "Leveät selkälihakset",
  mid_back: "Keskiselkä",
  lower_back: "Alaselkä",
  back: "Selkä",
  shoulders: "Olkapäät",
  biceps: "Hauikset",
  triceps: "Ojentajat",
  forearms: "Kyynärvarret",
  traps: "Epäkkäät",
  neck: "Niska",
  abs: "Vatsalihakset",
  core: "Core",
  obliques: "Vinot vatsalihakset",
  glutes: "Pakarat",
  quadriceps: "Etureidet",
  quads: "Etureidet",
  hamstrings: "Takareidet",
  adductors: "Reiden lähentäjät",
  abductors: "Reiden loitontajat",
  "hip flexors": "Lonkankoukistajat",
  calves: "Pohkeet",
  full_body: "Koko keho",
};

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#ef4444",
  neck: "#f97316",
  triceps: "#f59e0b",
  biceps: "#eab308",
  forearms: "#84cc16",
  quadriceps: "#22c55e",
  quads: "#22c55e",
  adductors: "#10b981",
  hamstrings: "#14b8a6",
  calves: "#06b6d4",
  abductors: "#0ea5e9",
  back: "#3b82f6",
  lats: "#6366f1",
  mid_back: "#0f766e",
  "hip flexors": "#8b5cf6",
  shoulders: "#a855f7",
  traps: "#d946ef",
  glutes: "#ec4899",
  abs: "#f43f5e",
  core: "#64748b",
  obliques: "#c2410c",
  lower_back: "#a16207",
  full_body: "#374151",
};

function translateMuscle(m: string) {
  return MUSCLE_GROUPS[m.toLowerCase()] ?? m;
}

function muscleColor(m: string) {
  return MUSCLE_COLORS[m.toLowerCase()] ?? "#94a3b8";
}

// One canonical key per unique color, sorted by Finnish label
const CANONICAL_TAGS = (() => {
  const seen = new Set<string>();
  return Object.keys(MUSCLE_COLORS)
    .filter((k) => {
      const c = MUSCLE_COLORS[k]!;
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    })
    .sort((a, b) => translateMuscle(a).localeCompare(translateMuscle(b), "fi"));
})();

type TagDef = { key: string; label: string; color: string };

function MuscleGroupPicker({
  selected,
  onChange,
  tags,
}: {
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  tags: TagDef[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {tags.map((t) => {
        const active = selected.has(t.key);
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              const next = new Set(selected);
              active ? next.delete(t.key) : next.add(t.key);
              onChange(next);
            }}
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all"
            style={{
              backgroundColor: active ? t.color : "transparent",
              color: active ? "#fff" : t.color,
              border: `1.5px solid ${t.color}`,
              opacity: active ? 1 : 0.65,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
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
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("muscle-labels");
      if (stored) setCustomLabels(JSON.parse(stored));
    } catch {}
  }, []);

  function saveLabel(tag: string, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = { ...customLabels, [tag]: trimmed };
    setCustomLabels(next);
    localStorage.setItem("muscle-labels", JSON.stringify(next));
  }

  function tagLabel(tag: string) {
    return customLabels[tag] ?? translateMuscle(tag);
  }

  function getTagColor(tag: string) {
    return MUSCLE_COLORS[tag.toLowerCase()] ?? "#94a3b8";
  }

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cInstructions, setCInstructions] = useState("");
  const [cSelectedGroups, setCSelectedGroups] = useState<Set<string>>(new Set());
  const [cVideoUrl, setCVideoUrl] = useState("");

  // edit dialog
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const [eName, setEName] = useState("");
  const [eInstructions, setEInstructions] = useState("");
  const [eSelectedGroups, setESelectedGroups] = useState<Set<string>>(new Set());
  const [eVideoUrl, setEVideoUrl] = useState("");

  // video preview dialog
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Unique tags from data, deduped by color
  const allTags = (() => {
    const known = new Set(Object.keys(MUSCLE_COLORS));
    const keys = Array.from(
      new Set(data.flatMap((e) => e.muscle_groups ?? []).map((m) => m.toLowerCase()))
    ).filter((k) => known.has(k));
    const seenColors = new Set<string>();
    return keys
      .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), "fi"))
      .filter((tag) => {
        const color = getTagColor(tag);
        if (seenColors.has(color)) return false;
        seenColors.add(color);
        return true;
      });
  })();

  const pickerTags: TagDef[] = CANONICAL_TAGS.map((k) => ({ key: k, label: tagLabel(k), color: getTagColor(k) }));

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  const selectedColors = new Set(Array.from(selectedTags).map(getTagColor));

  const filtered = data.filter((e) => {
    const matchesSearch = !search.trim() || e.name.toLowerCase().includes(search.toLowerCase());
    const matchesTags = selectedTags.size === 0 || (e.muscle_groups ?? []).some((m) => selectedColors.has(getTagColor(m.toLowerCase())));
    return matchesSearch && matchesTags;
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("not signed in");
      await createExercise(supabase, {
        created_by: user.user.id,
        name: cName,
        instructions: cInstructions || null,
        muscle_groups: Array.from(cSelectedGroups),
        video_path: cVideoUrl.trim() || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      setCreateOpen(false);
      setCName(""); setCInstructions(""); setCSelectedGroups(new Set()); setCVideoUrl("");
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
        muscle_groups: Array.from(eSelectedGroups),
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
    setESelectedGroups(new Set((e.muscle_groups ?? []).map((m) => m.toLowerCase())));
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hae liikkeitä…"
          className="h-10 w-full md:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => {
            const active = selectedTags.has(tag);
            const color = getTagColor(tag);
            const isEditing = editingTag === tag;
            const label = tagLabel(tag);
            return (
              <span key={tag} className="group/tag relative inline-flex">
                {isEditing ? (
                  <input
                    autoFocus
                    defaultValue={label}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium outline-none"
                    style={{
                      border: `1.5px solid ${color}`,
                      color,
                      width: `${Math.max(label.length + 2, 6)}ch`,
                    }}
                    onBlur={(e) => { saveLabel(tag, e.target.value); setEditingTag(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingTag(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: active ? color : "transparent",
                      color: active ? "#fff" : color,
                      border: `1.5px solid ${color}`,
                      opacity: active ? 1 : 0.7,
                      transition: "transform 200ms cubic-bezier(0.34,1.56,0.64,1), opacity 150ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {label}
                    <Pencil
                      className="h-2.5 w-2.5 opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setEditingTag(tag); }}
                    />
                  </button>
                )}
              </span>
            );
          })}
          {selectedTags.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags(new Set())}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors border border-muted"
            >
              Tyhjennä
            </button>
          )}
        </div>
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
                    <span key={m} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getTagColor(m) }} title={tagLabel(m)} />
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
                    <span key={m} className="inline-flex items-center rounded-full px-1.5 h-4 text-[9px] font-medium text-white" style={{ backgroundColor: getTagColor(m) }}>
                      {tagLabel(m)}
                    </span>
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
              <Label>Lihasryhmät</Label>
              <MuscleGroupPicker selected={cSelectedGroups} onChange={setCSelectedGroups} tags={pickerTags} />
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
              <Label>Lihasryhmät</Label>
              <MuscleGroupPicker selected={eSelectedGroups} onChange={setESelectedGroups} tags={pickerTags} />
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

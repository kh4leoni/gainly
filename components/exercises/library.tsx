"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getExercises, createExercise } from "@/lib/queries/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export function ExerciseLibrary() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["exercises"], queryFn: () => getExercises(supabase) });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [muscleGroups, setMuscleGroups] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("not signed in");

      let video_path: string | null = null;
      if (videoFile) {
        const key = `${user.user.id}/${Date.now()}-${videoFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("exercise-videos")
          .upload(key, videoFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        video_path = key;
      }

      await createExercise(supabase, {
        created_by: user.user.id,
        name,
        instructions: instructions || null,
        muscle_groups: muscleGroups.split(",").map((s) => s.trim()).filter(Boolean),
        video_path,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      setOpen(false);
      setName(""); setInstructions(""); setMuscleGroups(""); setVideoFile(null);
      toast({ title: "Exercise added" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Exercises</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New exercise
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((e) => (
          <Card key={e.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{e.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {e.instructions && <p className="text-sm text-muted-foreground line-clamp-3">{e.instructions}</p>}
              <div className="flex flex-wrap gap-1">
                {(e.muscle_groups ?? []).map((m) => (
                  <Badge key={m} variant="outline">{m}</Badge>
                ))}
              </div>
              {e.created_by == null && <Badge variant="secondary">Global</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Muscle groups (comma-separated)</Label>
              <Input value={muscleGroups} onChange={(e) => setMuscleGroups(e.target.value)} placeholder="chest, triceps" />
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Upload className="h-4 w-4" /> Video (optional)</Label>
              <Input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!name || working || create.isPending} onClick={() => { setWorking(true); create.mutate(undefined, { onSettled: () => setWorking(false) }); }}>
              {create.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

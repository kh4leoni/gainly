"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDragToDismiss } from "@/hooks/use-drag-to-dismiss";
import { createClient } from "@/lib/supabase/client";
import { getExerciseHistory, type ExerciseHistoryGroup } from "@/lib/queries/workouts";

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
}

function HistoryRow({ group }: { group: ExerciseHistoryGroup }) {
  return (
    <div style={{
      borderRadius: "var(--r-md)",
      border: "1px solid var(--c-border)",
      background: "var(--c-surface2)",
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
        color: "var(--c-text-muted)",
      }}>
        {fmtDate(group.loggedAt)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {group.sets.map((s, i) => {
          const repsLbl = s.reps != null ? `${s.reps} t` : "–";
          const weightLbl = s.weight != null ? `${s.weight} kg` : "–";
          const rpeLbl = s.rpe != null ? `RPE ${s.rpe === 5 ? "<6" : s.rpe}` : null;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 13,
              color: "var(--c-text)",
              fontVariantNumeric: "tabular-nums",
            }}>
              <span style={{
                flexShrink: 0, fontSize: 10, fontWeight: 700, width: 16,
                color: "var(--c-text-subtle)",
              }}>
                {s.set_number ?? i + 1}.
              </span>
              <span style={{ fontWeight: 600 }}>{weightLbl}</span>
              <span style={{ color: "var(--c-text-muted)" }}>× {repsLbl}</span>
              {rpeLbl && (
                <span style={{
                  marginLeft: "auto", fontSize: 11, color: "var(--c-pink)", fontWeight: 600,
                }}>
                  {rpeLbl}
                </span>
              )}
              {s.is_pr && (
                <span style={{
                  marginLeft: rpeLbl ? 0 : "auto",
                  fontSize: 10, fontWeight: 700,
                  background: "color-mix(in srgb, var(--c-pink) 18%, transparent)",
                  color: "var(--c-pink)",
                  padding: "2px 6px", borderRadius: "var(--r-sm)",
                  letterSpacing: "0.05em",
                }}>
                  PR
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ExerciseHistoryDialog({
  exerciseName,
  exerciseId,
  clientId,
  trigger,
}: {
  exerciseName: string;
  exerciseId: string | null;
  clientId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useDragToDismiss({
    handleRef,
    contentRef,
    onDismiss: () => setOpen(false),
    enabled: open,
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ["exercise-history", clientId, exerciseId],
    queryFn: () => getExerciseHistory(supabase, clientId, exerciseId!),
    enabled: open && !!exerciseId && !!clientId,
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        ref={contentRef}
        className="client-themed max-h-[85vh] flex flex-col overflow-hidden"
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
        } as React.CSSProperties}
      >
        <div ref={handleRef} className="ios-drag-handle" aria-hidden>
          <div className="ios-drag-handle-bar" />
        </div>
        <DialogHeader style={{ flexShrink: 0 }}>
          <DialogTitle style={{ color: "var(--c-text)" }}>{exerciseName}</DialogTitle>
        </DialogHeader>
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
          {isLoading && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--c-text-muted)", fontSize: 13 }}>
              Ladataan…
            </div>
          )}
          {!isLoading && (!history || history.length === 0) && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--c-text-muted)", fontSize: 13 }}>
              Ei aiempaa historiaa tästä liikkeestä.
            </div>
          )}
          {history?.map((g) => (
            <HistoryRow key={g.workoutLogId} group={g} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

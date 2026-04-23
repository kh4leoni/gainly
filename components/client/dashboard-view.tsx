"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getTodayWorkout, getClientStreak, getClientCompliance } from "@/lib/queries/workouts";
import { usePrToast } from "@/hooks/use-pr-toast";

const FI_DAYS = ["sunnuntai","maanantai","tiistai","keskiviikko","torstai","perjantai","lauantai"];

export function ClientDashboardView({ clientId }: { clientId: string }) {
  const supabase = createClient();
  usePrToast(clientId);

  const today = useQuery({
    queryKey: ["today", clientId],
    queryFn: () => getTodayWorkout(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });
  const streak = useQuery({
    queryKey: ["streak", clientId],
    queryFn: () => getClientStreak(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });
  const compliance = useQuery({
    queryKey: ["compliance", clientId],
    queryFn: () => getClientCompliance(supabase, clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const now = new Date();
  const dateLabel = `${FI_DAYS[now.getDay()] ?? ""} ${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;

  const workout = today.data;
  const exercises = workout?.program_days?.program_exercises ?? [];
  const exNames = exercises
    .slice()
    .sort((a, b) => a.order_idx - b.order_idx)
    .map((e) => e.exercises?.name)
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 4, textTransform: "capitalize" }}>
          {dateLabel}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1.1 }}>
          Hei! 👋
        </div>
      </div>

      {/* Streak + compliance */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: "#F5A623" }}>
              {streak.data ?? 0}
            </div>
            <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>päivän putki</div>
          </div>
        </div>
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--c-pink)" }}>
              {compliance.data ?? 0}%
            </div>
            <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>noudatus</div>
          </div>
        </div>
      </div>

      {/* Today's workout card */}
      {workout ? (
        <div style={{
          background: "linear-gradient(135deg,rgba(255,29,140,0.15) 0%,rgba(155,77,202,0.10) 100%)",
          border: "1px solid rgba(255,29,140,0.25)",
          borderRadius: 18,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--c-pink)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
                Tämän päivän treeni
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>
                {workout.program_days?.name ?? "Treeni"}
              </div>
            </div>
            {workout.status !== "completed" && (
              <div style={{ background: "var(--c-pink)", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#fff", boxShadow: "0 0 16px var(--c-pink-glow)", whiteSpace: "nowrap" }}>
                Nyt!
              </div>
            )}
            {workout.status === "completed" && (
              <div style={{ background: "rgba(62,207,142,0.15)", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#3ECF8E", border: "1px solid rgba(62,207,142,0.3)", whiteSpace: "nowrap" }}>
                ✓ Tehty
              </div>
            )}
          </div>

          {workout.program_days?.description && (
            <div style={{ fontSize: 13, color: "var(--c-text-muted)", fontStyle: "italic", lineHeight: 1.5, marginBottom: 14 }}>
              {workout.program_days.description}
            </div>
          )}

          {exNames.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 16 }}>
              {exNames.join(" · ")}{exercises.length > 4 ? ` +${exercises.length - 4}` : ""}
            </div>
          )}

          <Link
            href={`/client/workout/${workout.id}`}
            style={{
              display: "block",
              width: "100%",
              padding: "13px",
              background: workout.status === "completed" ? "rgba(62,207,142,0.15)" : "var(--c-pink)",
              border: workout.status === "completed" ? "1px solid rgba(62,207,142,0.3)" : "none",
              borderRadius: 12,
              color: workout.status === "completed" ? "#3ECF8E" : "#fff",
              fontSize: 14,
              fontWeight: 700,
              textAlign: "center",
              textDecoration: "none",
              boxShadow: workout.status !== "completed" ? "0 0 20px var(--c-pink-glow)" : "none",
              letterSpacing: "-0.2px",
            }}
          >
            {workout.status === "completed" ? "Tarkastele treeeniä" : "🔥 Aloita treeni"}
          </Link>
        </div>
      ) : (
        <div style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 18,
          padding: 24,
          marginBottom: 20,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>😴</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Lepopäivä</div>
          <div style={{ fontSize: 13, color: "var(--c-text-muted)", marginTop: 4 }}>
            Ei treenejä tänään. Nauti levosta!
          </div>
        </div>
      )}

      {/* Week description */}
      {workout?.program_days?.program_weeks?.description && (
        <div style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
            Viikkojen kuvaus
          </div>
          <div style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.5 }}>
            {workout.program_days.program_weeks.description}
          </div>
        </div>
      )}
    </div>
  );
}

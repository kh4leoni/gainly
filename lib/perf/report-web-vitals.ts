"use client";

// Optional: wire to Vercel Analytics / Sentry. Kept minimal on purpose.
export function reportWebVitals(metric: { name: string; value: number; id: string }) {
  if (process.env.NODE_ENV !== "production") return;
  // Example: navigator.sendBeacon("/api/vitals", JSON.stringify(metric));
  console.debug("[web-vitals]", metric.name, metric.value.toFixed(1));
}

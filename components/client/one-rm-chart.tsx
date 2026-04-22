"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function OneRmChart({ data }: { data: Array<{ day: string; best_1rm: number }> }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Ei sarjoja vielä.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" tickFormatter={(v) => new Date(v).toLocaleDateString("fi-FI", { month: "short", day: "numeric" })} />
          <YAxis />
          <Tooltip labelFormatter={(v) => new Date(v as string).toLocaleDateString("fi-FI")} />
          <Line type="monotone" dataKey="best_1rm" stroke="#0f172a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

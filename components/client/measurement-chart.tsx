"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function MeasurementChart({
  data,
  unit,
  color,
  emptyText,
  height = 180,
}: {
  data: { value: number; logged_at: string }[];
  unit: string;
  color: string;
  emptyText: string;
  height?: number;
}) {
  const chartData = [...data].reverse().map((d) => ({ date: d.logged_at, value: d.value }));

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "28px 0", color: "var(--c-text-muted, hsl(var(--muted-foreground)))", fontSize: 13 }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border, hsl(var(--border)))" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric" })}
            tick={{ fontSize: 10, fill: "var(--c-text-muted, hsl(var(--muted-foreground)))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--c-text-muted, hsl(var(--muted-foreground)))" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            labelFormatter={(v) => new Date(v as string).toLocaleDateString("fi-FI")}
            formatter={(v: number) => [`${v} ${unit}`, ""]}
            contentStyle={{
              background: "var(--c-surface, hsl(var(--card)))",
              border: "1px solid var(--c-border, hsl(var(--border)))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

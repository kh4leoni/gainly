"use client";

import { useId } from "react";
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/**
 * Estimated-1RM progression line for a single exercise over time.
 * Data comes from the `one_rm_curve` RPC (daily best e1RM). Styled to the
 * `--c-*` monochrome theme to match `MeasurementChart`.
 */
export function OneRmTrend({
  data,
  color = "var(--c-pink)",
  height = 150,
}: {
  data: Array<{ day: string; best_1rm: number | string }>;
  color?: string;
  height?: number;
}) {
  const gid = useId().replace(/:/g, "");
  const chartData = data.map((d) => ({ day: d.day, value: Number(d.best_1rm) }));

  // A single point isn't a trend — the rep-max table already shows the value.
  if (chartData.length < 2) return null;

  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.26} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tickFormatter={(v) => new Date(v).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric" })}
            tick={{ fontSize: 10, fill: "var(--c-text-muted)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--c-text-muted)" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            width={36}
          />
          <Tooltip
            labelFormatter={(v) => new Date(v as string).toLocaleDateString("fi-FI")}
            formatter={(v: number) => [`${Math.round(v)} kg`, "e1RM"]}
            contentStyle={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gid})`}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

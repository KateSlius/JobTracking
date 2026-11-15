"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCalendarDayMonth } from "@/lib/format";

type Week = { weekStart: Date; count: number };

/** Only the two props this tooltip reads; Recharts passes many more. */
type WeekTooltipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

function WeekTooltip({ active, payload }: WeekTooltipProps) {
  if (!active || !payload?.length) return null;
  const week = payload[0].payload as Week & { label: string };
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-2.5 py-1.5 text-xs shadow-sm">
      {/* Value leads, label follows. */}
      <p className="text-sm font-semibold tabular-nums">
        {week.count} {week.count === 1 ? "application" : "applications"}
      </p>
      <p className="text-muted-foreground">Week commencing {week.label}</p>
    </div>
  );
}

/** Applications sent per London week (Monday start). One series, so no legend. */
export function WeeklyChart({ weeks }: { weeks: Week[] }) {
  const data = weeks.map((w) => ({ ...w, label: formatCalendarDayMonth(w.weekStart) }));
  const max = Math.max(0, ...data.map((d) => d.count));

  return (
    <figure className="flex flex-col gap-3">
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: -24 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              domain={[0, Math.max(4, max)]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              width={48}
            />
            <Tooltip
              content={(props) => <WeekTooltip active={props.active} payload={props.payload} />}
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              isAnimationActive={false}
            />
            <Bar
              dataKey="count"
              name="Applications"
              fill="var(--viz-accent)"
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              activeBar={{ fill: "var(--viz-accent)", fillOpacity: 0.85 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer text-xs">
          View as table
        </summary>
        <table className="mt-2 w-full max-w-xs text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-1 font-normal">Week commencing</th>
              <th className="py-1 text-right font-normal">Applications</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b last:border-0">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right tabular-nums">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

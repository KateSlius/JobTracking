import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarLoader } from "@/components/calendar/calendar-loader";
import { getCalendarItems } from "@/server/queries/calendar";

export const metadata: Metadata = { title: "Calendar" };

async function CalendarData() {
  const items = await getCalendarItems();
  return <CalendarLoader items={items} />;
}

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground text-sm">All times are UK time.</p>
        </div>
        {/* Two kinds of event, so a legend: colour is never the only cue (titles also say). */}
        <ul className="text-muted-foreground flex gap-4 text-sm" aria-label="Key">
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full bg-[var(--viz-accent)]" /> Interview
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full bg-[var(--cal-deadline)]" /> Closing
            date
          </li>
        </ul>
      </div>
      <Suspense fallback={<div className="bg-muted h-[640px] animate-pulse rounded-lg" />}>
        <CalendarData />
      </Suspense>
    </div>
  );
}

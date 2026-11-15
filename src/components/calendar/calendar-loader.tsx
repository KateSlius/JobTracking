"use client";

import dynamic from "next/dynamic";
import type { CalendarItem } from "@/server/queries/calendar";

// FullCalendar measures the DOM and picks its view from the screen width, so it only renders in
// the browser. The skeleton keeps the layout from jumping while it loads.
const CalendarView = dynamic(() => import("./calendar-view"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted h-[640px] animate-pulse rounded-lg" aria-label="Loading calendar" />
  ),
});

export function CalendarLoader({ items }: { items: CalendarItem[] }) {
  return <CalendarView items={items} />;
}

"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import listPlugin from "@fullcalendar/react/list";
import enGbLocale from "@fullcalendar/react/locales/en-gb";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import { INTERVIEW_TYPE_LABEL } from "@/lib/constants";
import { toLondonWallIso } from "@/lib/format";
import type { CalendarItem } from "@/server/queries/calendar";

/**
 * Time zone approach: the server sends London wall-clock times with no offset, and the calendar
 * runs in UTC mode, so it shows those times exactly as given. `now` is London wall time too, so
 * "today" and the now-line are right whatever time zone the viewer's computer is set to.
 */
export default function CalendarView({ items }: { items: CalendarItem[] }) {
  // Rendered client-only (see calendar-loader.tsx), so reading the window here is safe.
  const narrow = window.matchMedia("(max-width: 640px)").matches;

  const events = items.map((item) =>
    item.kind === "interview"
      ? {
          id: `i-${item.id}`,
          title: `${item.title} (${INTERVIEW_TYPE_LABEL[item.type]}${item.stage ? `, ${item.stage}` : ""})`,
          start: item.start,
          end: item.end,
          url: `/applications/${item.applicationId}`,
        }
      : {
          id: `c-${item.id}`,
          title: item.title,
          start: item.date,
          allDay: true,
          url: `/applications/${item.applicationId}`,
          // Set per event: the theme's event colour variable doesn't reach individual events.
          color: "var(--cal-deadline)",
          textColor: "#fff",
        },
  );

  return (
    <div className="jt-calendar">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, classicThemePlugin]}
        locale={enGbLocale}
        timeZone="UTC"
        now={() => toLondonWallIso(new Date())}
        firstDay={1}
        initialView={narrow ? "listMonth" : "dayGridMonth"}
        headerToolbar={
          narrow
            ? { start: "title", end: "prev,next" }
            : {
                start: "prev,next today",
                center: "title",
                end: "dayGridMonth,timeGridWeek,listMonth",
              }
        }
        footerToolbar={
          narrow ? { start: "today", end: "dayGridMonth,timeGridWeek,listMonth" } : false
        }
        buttons={{
          // The hint becomes the accessible name; it must contain the visible text.
          today: { text: "Today", hint: "Today" },
          dayGridMonth: { text: "Month" },
          timeGridWeek: { text: "Week" },
          listMonth: { text: "List" },
        }}
        events={events}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotHeaderFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        scrollTime="08:30:00"
        nowIndicator
        dayMaxEvents={3}
        height="auto"
        noEventsContent="Nothing scheduled this month."
        allDayText="All day"
      />
    </div>
  );
}

/**
 * iCalendar (RFC 5545) export for interviews, plus "add to Google / Outlook" links.
 * Events are written in Europe/London wall time with a VTIMEZONE block, so calendars show
 * the right time either side of the clocks changing. The UID is stable per interview and
 * SEQUENCE goes up on every edit, so re-importing updates the event instead of duplicating it.
 */
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

const london = tz("Europe/London");
const utc = tz("UTC");

export type CalendarEvent = {
  uid: string;
  sequence: number;
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string | null;
  url?: string | null;
};

const VTIMEZONE_LONDON = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/London",
  "X-LIC-LOCATION:Europe/London",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "TZNAME:BST",
  "DTSTART:19700329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "TZNAME:GMT",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** TEXT value escaping (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a content line at 75 octets (UTF-8), never splitting a character (§3.1). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // First line holds 75 octets; continuation lines start with a space, so they hold 74.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const londonStamp = (d: Date) => format(d, "yyyyMMdd'T'HHmmss", { in: london });
const utcStamp = (d: Date) => format(d, "yyyyMMdd'T'HHmmss'Z'", { in: utc });

export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UK Job Tracker//Interviews//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE_LONDON,
    "BEGIN:VEVENT",
    `UID:${event.uid}@uk-job-tracker`,
    `DTSTAMP:${utcStamp(now)}`,
    `SEQUENCE:${event.sequence}`,
    `DTSTART;TZID=Europe/London:${londonStamp(event.start)}`,
    `DTEND;TZID=Europe/London:${londonStamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    // A one-hour heads-up; calendars that ignore alarms simply skip it.
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT1H",
    `DESCRIPTION:${escapeText(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Google Calendar "create event" link. Times in UTC; ctz tells Google to show London time. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
    ctz: "Europe/London",
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

/**
 * Outlook web "compose event" link. `personal` is Outlook.com; `work` is Microsoft 365
 * (work or school accounts), which lives on a different host.
 */
export function outlookCalendarUrl(event: CalendarEvent, account: "personal" | "work"): string {
  const host = account === "work" ? "outlook.office.com" : "outlook.live.com";
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
  });
  if (event.description) params.set("body", event.description);
  if (event.location) params.set("location", event.location);
  return `https://${host}/calendar/0/action/compose?${params}`;
}

/** Safe file name: "interview-monzo-2026-11-18.ics". */
export function icsFileName(company: string, start: Date): string {
  const slug = company
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `interview-${slug || "event"}-${format(start, "yyyy-MM-dd", { in: london })}.ics`;
}

/**
 * UK formatting helpers. All UI dates, times and money go through here.
 *
 * Two kinds of date exist in this app:
 * - Instants (`timestamptz`, e.g. interview start): stored UTC, shown in Europe/London.
 * - Calendar dates (`date`, e.g. closing date): no time or zone. Prisma returns these
 *   as a Date at 00:00 UTC, so they are formatted in UTC to avoid any day shift.
 */
import { format, isValid, parse, startOfMonth, startOfWeek } from "date-fns";
import { tz, TZDate } from "@date-fns/tz";

export const LONDON = "Europe/London";
const london = tz(LONDON);
const utc = tz("UTC");

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Instant → "15/11/2026" in London time. */
export function formatDate(value: DateInput): string {
  return format(toDate(value), "dd/MM/yyyy", { in: london });
}

/** Instant → "14:30" (24-hour) in London time. */
export function formatTime(value: DateInput): string {
  return format(toDate(value), "HH:mm", { in: london });
}

/** Instant → "15/11/2026, 14:30" in London time. */
export function formatDateTime(value: DateInput): string {
  return format(toDate(value), "dd/MM/yyyy, HH:mm", { in: london });
}

/** Instant → "Sun 15 Nov 2026" in London time, for friendlier lists. */
export function formatDateLong(value: DateInput): string {
  return format(toDate(value), "EEE d MMM yyyy", { in: london });
}

/** Calendar date (Postgres `date`) → "31/03/2026". */
export function formatCalendarDate(value: DateInput): string {
  return format(toDate(value), "dd/MM/yyyy", { in: utc });
}

/**
 * "31/03/2026" → Date at 00:00 UTC, ready to store in a `date` column.
 * Returns null for anything that is not a real DD/MM/YYYY date.
 */
export function parseUkDate(input: string): Date | null {
  const trimmed = input.trim();
  if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return null;
  const parsed = parse(trimmed, "d/M/yyyy", new TZDate(0, "UTC"), { in: utc });
  if (!isValid(parsed)) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

/**
 * A wall-clock time in London (e.g. from a form: "2026-03-29", "09:30") → UTC instant.
 * Handles the BST switch, so 09:30 in July is 08:30 UTC and 09:30 in January is 09:30 UTC.
 */
export function londonWallTimeToUtc(isoDate: string, time: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, LONDON).getTime());
}

/** Monday 00:00 London time of the week containing `now`, as a UTC instant. */
export function startOfLondonWeek(now: DateInput = new Date()): Date {
  return new Date(startOfWeek(toDate(now), { weekStartsOn: 1, in: london }).getTime());
}

/** 1st of the month 00:00 London time, as a UTC instant. */
export function startOfLondonMonth(now: DateInput = new Date()): Date {
  return new Date(startOfMonth(toDate(now), { in: london }).getTime());
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const gbpWithPence = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

/** Whole pence → "£45,000". Shows pence only when there are some ("£512.50"). */
export function formatGBP(pence: number): string {
  return pence % 100 === 0 ? gbp.format(pence / 100) : gbpWithPence.format(pence / 100);
}

export type SalaryPeriod = "ANNUM" | "DAY";

const PERIOD_LABEL: Record<SalaryPeriod, string> = {
  ANNUM: "per annum",
  DAY: "per day",
};

/** → "£45,000–£55,000 per annum", "£500 per day", "Up to £60,000 per annum", or null. */
export function formatSalary(
  minPence: number | null | undefined,
  maxPence: number | null | undefined,
  period: SalaryPeriod,
): string | null {
  const label = PERIOD_LABEL[period];
  const hasMin = minPence != null;
  const hasMax = maxPence != null;
  if (hasMin && hasMax) {
    if (minPence === maxPence) return `${formatGBP(minPence)} ${label}`;
    return `${formatGBP(minPence)}–${formatGBP(maxPence)} ${label}`;
  }
  if (hasMin) return `From ${formatGBP(minPence)} ${label}`;
  if (hasMax) return `Up to ${formatGBP(maxPence)} ${label}`;
  return null;
}

/** Today's date in London as a calendar date (00:00 UTC), for `date` columns like appliedOn. */
export function londonToday(now: DateInput = new Date()): Date {
  const [y, m, d] = format(toDate(now), "yyyy-MM-dd", { in: london }).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Calendar date → "YYYY-MM-DD" string, e.g. for <input type="date"> or comparisons. */
export function calendarDateToIso(value: DateInput): string {
  return format(toDate(value), "yyyy-MM-dd", { in: utc });
}

/** Calendar date → "9 Nov", for chart axes and compact lists. */
export function formatCalendarDayMonth(value: DateInput): string {
  return format(toDate(value), "d MMM", { in: utc });
}

/** Instant → "Mon 16 Nov, 14:30" in London time, for upcoming events. */
export function formatEventTime(value: DateInput): string {
  return format(toDate(value), "EEE d MMM, HH:mm", { in: london });
}

/**
 * What people type into a time box → { hours, minutes } on a 24-hour clock, or null.
 * Accepts "14:30", "14.30", "1430", "930", "9:00", "9am", "2:30pm", "12pm" (noon), "12am" (midnight).
 */
export function parseClockTime(input: string): { hours: number; minutes: number } | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, "");
  const match = /^(\d{1,2})(?:[:.]?(\d{2}))?(am|pm)?$/.exec(text);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "am") hours = hours === 12 ? 0 : hours;
    else hours = hours === 12 ? 12 : hours + 12;
  } else if (hours > 23) {
    return null;
  }
  return { hours, minutes };
}

/** { hours, minutes } → "09:30". */
export function formatClockTime({ hours, minutes }: { hours: number; minutes: number }): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Instant → London wall-clock ISO string with no offset, e.g. "2026-11-18T10:00:00".
 * For the calendar, which runs in UTC mode so these "floating" times display exactly as London
 * time whatever the viewer's computer is set to.
 */
export function toLondonWallIso(value: DateInput): string {
  return format(toDate(value), "yyyy-MM-dd'T'HH:mm:ss", { in: london });
}

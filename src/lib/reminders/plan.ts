/**
 * Which automatic reminders an application should have right now. Pure, so the rules are tested
 * in one place; src/lib/reminders/sync.ts writes the result to the database.
 *
 *   CLOSING_DATE    09:00 three days before the closing date, while the role is Saved
 *   FOLLOW_UP       09:00 seven days after applying, while still at Applied (no reply yet)
 *   INTERVIEW_PREP  09:00 the day before each upcoming interview
 *
 * All times are London wall-clock times, so 09:00 stays 09:00 across the clock change.
 */
import type { ApplicationStatus, ReminderKind } from "@/generated/prisma/enums";
import {
  calendarDateToIso,
  formatCalendarDate,
  formatEventTime,
  londonToday,
  londonWallTimeToUtc,
} from "@/lib/format";

export const REMINDER_TIME = "09:00";
export const CLOSING_DATE_DAYS_BEFORE = 3;
export const FOLLOW_UP_DAYS_AFTER = 7;

export const AUTO_REMINDER_KINDS = [
  "CLOSING_DATE",
  "FOLLOW_UP",
  "INTERVIEW_PREP",
] as const satisfies readonly ReminderKind[];
export type AutoReminderKind = (typeof AUTO_REMINDER_KINDS)[number];

export type PlannerApplication = {
  status: ApplicationStatus;
  roleTitle: string;
  companyName: string;
  /** Calendar dates (00:00 UTC), as stored in Postgres `date` columns. */
  closingDate: Date | null;
  appliedOn: Date | null;
  interviews: { id: string; startsAt: Date }[];
};

export type PlannedReminder = {
  kind: AutoReminderKind;
  interviewId: string | null;
  plannedAt: Date;
  title: string;
};

const DAY_MS = 86_400_000;

/** A calendar date (00:00 UTC) shifted by `days`, at 09:00 London time. */
function londonMorning(calendarDate: Date, days: number): Date {
  const shifted = new Date(calendarDate.getTime() + days * DAY_MS);
  return londonWallTimeToUtc(calendarDateToIso(shifted), REMINDER_TIME);
}

/** Identity of an automatic reminder: one per kind per application, one prep per interview. */
export function reminderKey(r: { kind: ReminderKind; interviewId: string | null }): string {
  return `${r.kind}:${r.interviewId ?? ""}`;
}

export function planAutoReminders(
  app: PlannerApplication,
  now: Date = new Date(),
): PlannedReminder[] {
  const role = `${app.roleTitle} at ${app.companyName}`;
  const planned: PlannedReminder[] = [];

  // Nothing to chase once the application is over.
  if (app.status === "REJECTED" || app.status === "WITHDRAWN") return planned;

  if (
    app.status === "SAVED" &&
    app.closingDate &&
    app.closingDate.getTime() >= londonToday(now).getTime()
  ) {
    planned.push({
      kind: "CLOSING_DATE",
      interviewId: null,
      plannedAt: londonMorning(app.closingDate, -CLOSING_DATE_DAYS_BEFORE),
      title: `Apply before ${formatCalendarDate(app.closingDate)}: ${role}`,
    });
  }

  if (app.status === "APPLIED" && app.appliedOn) {
    planned.push({
      kind: "FOLLOW_UP",
      interviewId: null,
      plannedAt: londonMorning(app.appliedOn, FOLLOW_UP_DAYS_AFTER),
      title: `Follow up: ${role}`,
    });
  }

  for (const interview of app.interviews) {
    if (interview.startsAt.getTime() <= now.getTime()) continue;
    planned.push({
      kind: "INTERVIEW_PREP",
      interviewId: interview.id,
      plannedAt: londonMorning(londonToday(interview.startsAt), -1),
      title: `Prepare for interview (${formatEventTime(interview.startsAt)}): ${role}`,
    });
  }

  return planned;
}

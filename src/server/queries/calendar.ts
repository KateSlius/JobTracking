import "server-only";
import type { ApplicationStatus, InterviewType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calendarDateToIso, toLondonWallIso } from "@/lib/format";

const DAY_MS = 86_400_000;

export type CalendarItem =
  | {
      kind: "interview";
      id: string;
      applicationId: string;
      title: string;
      /** London wall-clock ISO with no offset; see toLondonWallIso. */
      start: string;
      end: string;
      type: InterviewType;
      stage: string | null;
    }
  | {
      kind: "closing";
      id: string;
      applicationId: string;
      title: string;
      /** Calendar date "YYYY-MM-DD" (all-day). */
      date: string;
      status: ApplicationStatus;
    };

/**
 * Interviews and closing dates from 6 months ago to a year ahead. A personal tracker has few
 * enough of these to load in one go rather than per visible range.
 */
export async function getCalendarItems(): Promise<CalendarItem[]> {
  const user = await requireUser();
  // Read the clock only after requireUser(): that marks the request as dynamic.
  const now = new Date();
  const from = new Date(now.getTime() - 183 * DAY_MS);
  const to = new Date(now.getTime() + 366 * DAY_MS);

  const [interviews, closing] = await db.$transaction([
    db.interview.findMany({
      where: {
        application: { userId: user.id, archivedAt: null },
        startsAt: { gte: from, lt: to },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        type: true,
        stage: true,
        startsAt: true,
        endsAt: true,
        application: { select: { id: true, roleTitle: true, company: { select: { name: true } } } },
      },
    }),
    // Closing dates only matter before you've applied (or for roles still open to you).
    db.application.findMany({
      where: {
        userId: user.id,
        archivedAt: null,
        status: { in: ["SAVED"] },
        closingDate: { gte: from, lt: to },
      },
      select: {
        id: true,
        roleTitle: true,
        status: true,
        closingDate: true,
        company: { select: { name: true } },
      },
    }),
  ]);

  return [
    ...interviews.map((i): CalendarItem => ({
      kind: "interview",
      id: i.id,
      applicationId: i.application.id,
      title: `${i.application.company.name} · ${i.application.roleTitle}`,
      start: toLondonWallIso(i.startsAt),
      end: toLondonWallIso(i.endsAt),
      type: i.type,
      stage: i.stage,
    })),
    ...closing.map((a): CalendarItem => ({
      kind: "closing",
      id: a.id,
      applicationId: a.id,
      title: `Closes: ${a.company.name} · ${a.roleTitle}`,
      date: calendarDateToIso(a.closingDate!),
      status: a.status,
    })),
  ];
}

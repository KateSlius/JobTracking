import "server-only";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { londonToday } from "@/lib/format";
import {
  appliedPerWeek,
  appliedThisPeriod,
  countByStatus,
  funnel,
  londonMonthStartDate,
  responseRate,
  type MetricsApplication,
} from "@/lib/metrics";

const DAY_MS = 86_400_000;
const UPCOMING_DAYS = 14;
const CLOSING_SOON_DAYS = 7;

export async function getDashboard() {
  const user = await requireUser();
  const now = new Date();
  const today = londonToday(now);

  const [apps, upcomingInterviews, overdueReminders, closingSoon] = await db.$transaction([
    // A personal tracker holds hundreds of rows at most, so metrics are computed in memory
    // from the history (see src/lib/metrics.ts) rather than in SQL.
    db.application.findMany({
      where: { userId: user.id, archivedAt: null },
      select: {
        status: true,
        appliedOn: true,
        statusChanges: { select: { toStatus: true } },
      },
    }),
    db.interview.findMany({
      where: {
        application: { userId: user.id, archivedAt: null },
        startsAt: { gte: now, lt: new Date(now.getTime() + UPCOMING_DAYS * DAY_MS) },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
      select: {
        id: true,
        type: true,
        stage: true,
        startsAt: true,
        application: { select: { id: true, roleTitle: true, company: { select: { name: true } } } },
      },
    }),
    db.reminder.findMany({
      where: { userId: user.id, completedAt: null, dismissedAt: null, dueAt: { lt: now } },
      orderBy: { dueAt: "asc" },
      take: 5,
      select: {
        id: true,
        kind: true,
        title: true,
        dueAt: true,
        application: { select: { id: true, company: { select: { name: true } } } },
      },
    }),
    db.application.findMany({
      where: {
        userId: user.id,
        archivedAt: null,
        status: "SAVED",
        closingDate: { gte: today, lte: new Date(today.getTime() + CLOSING_SOON_DAYS * DAY_MS) },
      },
      orderBy: { closingDate: "asc" },
      take: 5,
      select: { id: true, roleTitle: true, closingDate: true, company: { select: { name: true } } },
    }),
  ]);

  // A closing-date reminder and the "closes in N days" row would say the same thing twice.
  const closingSoonIds = new Set(closingSoon.map((a) => a.id));
  const attentionReminders = overdueReminders.filter(
    (r) => !(r.kind === "CLOSING_DATE" && r.application && closingSoonIds.has(r.application.id)),
  );

  const metricsApps: MetricsApplication[] = apps.map((a) => ({
    status: a.status,
    appliedOn: a.appliedOn,
    history: a.statusChanges.map((c) => c.toStatus),
  }));
  const byStatus = countByStatus(metricsApps);

  return {
    total: apps.length,
    byStatus,
    active: byStatus.APPLIED + byStatus.ASSESSMENT + byStatus.INTERVIEW + byStatus.OFFER,
    period: appliedThisPeriod(metricsApps, now),
    monthStart: londonMonthStartDate(now),
    response: responseRate(metricsApps),
    funnel: funnel(metricsApps),
    weekly: appliedPerWeek(metricsApps, now, 8),
    today,
    upcomingInterviews,
    overdueReminders: attentionReminders,
    closingSoon,
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

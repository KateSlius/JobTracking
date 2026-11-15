/**
 * Dashboard metrics as pure functions, so the definitions in PLAN.md are tested in one place.
 * Inputs come from Application.status, Application.appliedOn and the StatusChange history.
 */
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { londonToday } from "@/lib/format";

export type MetricsApplication = {
  status: ApplicationStatus;
  appliedOn: Date | null;
  /** Every `toStatus` from the StatusChange history, any order. */
  history: ApplicationStatus[];
};

const APPLIED_OR_LATER = new Set<ApplicationStatus>([
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
]);

/** Any reply from the employer: moving forward or a rejection. */
const RESPONSE = new Set<ApplicationStatus>(["ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED"]);

/** Funnel stages in order. Rejected and Withdrawn are exits, not stages. */
export const FUNNEL_STAGES = ["APPLIED", "ASSESSMENT", "INTERVIEW", "OFFER"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];
const STAGE_RANK: Partial<Record<ApplicationStatus, number>> = {
  APPLIED: 1,
  ASSESSMENT: 2,
  INTERVIEW: 3,
  OFFER: 4,
};

function everStatuses(app: MetricsApplication): ApplicationStatus[] {
  return [...app.history, app.status];
}

export function hasApplied(app: MetricsApplication): boolean {
  return everStatuses(app).some((s) => APPLIED_OR_LATER.has(s));
}

export function hasResponse(app: MetricsApplication): boolean {
  return everStatuses(app).some((s) => RESPONSE.has(s));
}

/**
 * Applications that heard back (Assessment, Interview, Offer or Rejected) ÷ applications that
 * reached Applied. Withdrawing before a reply counts as no response. Null when nothing applied.
 */
export function responseRate(apps: MetricsApplication[]) {
  const applied = apps.filter(hasApplied);
  const responded = applied.filter(hasResponse).length;
  return {
    applied: applied.length,
    responded,
    rate: applied.length ? responded / applied.length : null,
  };
}

/**
 * How many applications reached each stage *or further*. People often skip Assessment, so an
 * application that went Applied → Interview counts towards Assessment too; this keeps the funnel
 * from ever widening. The Applied stage includes applications added straight as Rejected.
 */
export function funnel(apps: MetricsApplication[]): { stage: FunnelStage; count: number }[] {
  const applied = apps.filter(hasApplied);
  const maxRank = applied.map((app) =>
    Math.max(1, ...everStatuses(app).map((s) => STAGE_RANK[s] ?? 0)),
  );
  return FUNNEL_STAGES.map((stage) => ({
    stage,
    count: maxRank.filter((r) => r >= STAGE_RANK[stage]!).length,
  }));
}

export function countByStatus(apps: MetricsApplication[]): Record<ApplicationStatus, number> {
  const counts: Record<ApplicationStatus, number> = {
    SAVED: 0,
    APPLIED: 0,
    ASSESSMENT: 0,
    INTERVIEW: 0,
    OFFER: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
  for (const app of apps) counts[app.status]++;
  return counts;
}

const DAY_MS = 86_400_000;

/** Monday of the London week containing `now`, as a calendar date (00:00 UTC). */
export function londonWeekStartDate(now: Date = new Date()): Date {
  const today = londonToday(now);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - daysSinceMonday * DAY_MS);
}

/** 1st of the London month containing `now`, as a calendar date (00:00 UTC). */
export function londonMonthStartDate(now: Date = new Date()): Date {
  const today = londonToday(now);
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
}

/** Applications by `appliedOn` (a calendar date) this London week and month. */
export function appliedThisPeriod(apps: MetricsApplication[], now: Date = new Date()) {
  const week = londonWeekStartDate(now).getTime();
  const lastWeek = week - 7 * DAY_MS;
  const month = londonMonthStartDate(now).getTime();
  let thisWeek = 0;
  let previousWeek = 0;
  let thisMonth = 0;
  for (const app of apps) {
    if (!app.appliedOn) continue;
    const t = app.appliedOn.getTime();
    if (t >= week) thisWeek++;
    else if (t >= lastWeek) previousWeek++;
    if (t >= month) thisMonth++;
  }
  return { thisWeek, previousWeek, thisMonth };
}

/** Applications per London week (Monday start) for the last `weeks` weeks, oldest first. */
export function appliedPerWeek(
  apps: MetricsApplication[],
  now: Date = new Date(),
  weeks = 8,
): { weekStart: Date; count: number }[] {
  const current = londonWeekStartDate(now).getTime();
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(current - (weeks - 1 - i) * 7 * DAY_MS),
    count: 0,
  }));
  const first = buckets[0].weekStart.getTime();
  for (const app of apps) {
    if (!app.appliedOn) continue;
    const t = app.appliedOn.getTime();
    if (t < first) continue;
    const index = Math.floor((t - first) / (7 * DAY_MS));
    if (index < weeks) buckets[index].count++;
  }
  return buckets;
}

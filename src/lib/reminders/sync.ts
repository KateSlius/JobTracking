/**
 * Brings an application's automatic reminders in line with planAutoReminders(). Call it inside
 * the same transaction as any change to an application, its status or its interviews.
 *
 * Rules:
 * - An open reminder follows its plan: a new planned time resets dueAt and the sent flags.
 * - A snoozed reminder keeps its later dueAt while the plan is unchanged (compares plannedAt).
 * - A completed or dismissed reminder stays closed while the plan is unchanged; if the plan moves
 *   (e.g. the interview is rescheduled) a fresh reminder is created.
 * - Open automatic reminders that are no longer planned are deleted. Custom ones are never touched.
 *
 * Takes the client as an argument (no "server-only"), so the seed script can use it too.
 */
import type { Prisma } from "@/generated/prisma/client";
import { AUTO_REMINDER_KINDS, planAutoReminders, reminderKey } from "./plan";

type Db = Prisma.TransactionClient;

export async function syncAutoReminders(
  db: Db,
  userId: string,
  applicationId: string,
  now: Date = new Date(),
): Promise<void> {
  const app = await db.application.findFirst({
    where: { id: applicationId, userId },
    select: {
      status: true,
      roleTitle: true,
      closingDate: true,
      appliedOn: true,
      archivedAt: true,
      company: { select: { name: true } },
      interviews: { select: { id: true, startsAt: true } },
    },
  });
  if (!app) return;

  const planned = app.archivedAt
    ? []
    : planAutoReminders(
        {
          status: app.status,
          roleTitle: app.roleTitle,
          companyName: app.company.name,
          closingDate: app.closingDate,
          appliedOn: app.appliedOn,
          interviews: app.interviews,
        },
        now,
      );

  const existing = await db.reminder.findMany({
    where: { applicationId, kind: { in: [...AUTO_REMINDER_KINDS] } },
    select: {
      id: true,
      kind: true,
      interviewId: true,
      plannedAt: true,
      title: true,
      completedAt: true,
      dismissedAt: true,
    },
  });

  const keep = new Set<string>();
  for (const plan of planned) {
    const key = reminderKey(plan);
    const rows = existing.filter((r) => reminderKey(r) === key);
    const open = rows.find((r) => !r.completedAt && !r.dismissedAt);

    if (open) {
      keep.add(open.id);
      if (open.plannedAt?.getTime() !== plan.plannedAt.getTime()) {
        await db.reminder.update({
          where: { id: open.id },
          data: {
            plannedAt: plan.plannedAt,
            dueAt: plan.plannedAt,
            title: plan.title,
            notifiedAt: null,
            emailedAt: null,
          },
        });
      } else if (open.title !== plan.title) {
        await db.reminder.update({ where: { id: open.id }, data: { title: plan.title } });
      }
      continue;
    }

    // Already done or dismissed for this exact schedule: leave it closed.
    if (rows.some((r) => r.plannedAt?.getTime() === plan.plannedAt.getTime())) continue;

    await db.reminder.create({
      data: {
        userId,
        applicationId,
        interviewId: plan.interviewId,
        kind: plan.kind,
        title: plan.title,
        plannedAt: plan.plannedAt,
        dueAt: plan.plannedAt,
      },
    });
  }

  const stale = existing
    .filter((r) => !r.completedAt && !r.dismissedAt && !keep.has(r.id))
    .map((r) => r.id);
  if (stale.length) await db.reminder.deleteMany({ where: { id: { in: stale } } });
}

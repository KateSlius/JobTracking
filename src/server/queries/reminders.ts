import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const DAY_MS = 86_400_000;

const reminderSelect = {
  id: true,
  kind: true,
  title: true,
  dueAt: true,
  completedAt: true,
  application: { select: { id: true, roleTitle: true, company: { select: { name: true } } } },
} satisfies Prisma.ReminderSelect;

export type ReminderRow = Prisma.ReminderGetPayload<{ select: typeof reminderSelect }>;

export async function getRemindersPage() {
  const user = await requireUser();
  const now = new Date();
  const open = { userId: user.id, completedAt: null, dismissedAt: null };

  const [overdue, upcoming, done, settings, applications] = await db.$transaction([
    db.reminder.findMany({
      where: { ...open, dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      select: reminderSelect,
    }),
    db.reminder.findMany({
      where: { ...open, dueAt: { gt: now, lte: new Date(now.getTime() + 60 * DAY_MS) } },
      orderBy: { dueAt: "asc" },
      take: 100,
      select: reminderSelect,
    }),
    db.reminder.findMany({
      where: { userId: user.id, completedAt: { gte: new Date(now.getTime() - 14 * DAY_MS) } },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: reminderSelect,
    }),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { emailRemindersEnabled: true } }),
    // For the "link to an application" picker on the add form.
    db.application.findMany({
      where: { userId: user.id, archivedAt: null, status: { notIn: ["REJECTED", "WITHDRAWN"] } },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, roleTitle: true, company: { select: { name: true } } },
    }),
  ]);

  return {
    overdue,
    upcoming,
    done,
    emailRemindersEnabled: settings.emailRemindersEnabled,
    applications: applications.map((a) => ({
      id: a.id,
      label: `${a.roleTitle} – ${a.company.name}`,
    })),
  };
}

/** Open reminders for one application, soonest first. */
export async function getApplicationReminders(applicationId: string) {
  const user = await requireUser();
  return db.reminder.findMany({
    where: { userId: user.id, applicationId, completedAt: null, dismissedAt: null },
    orderBy: { dueAt: "asc" },
    select: reminderSelect,
  });
}

export async function getNotifications() {
  const user = await requireUser();
  const [unread, latest] = await db.$transaction([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        message: true,
        readAt: true,
        createdAt: true,
        reminder: { select: { applicationId: true } },
      },
    }),
  ]);
  return { unread, latest };
}

export type NotificationsData = Awaited<ReturnType<typeof getNotifications>>;

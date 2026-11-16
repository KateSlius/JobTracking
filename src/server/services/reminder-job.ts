import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { buildReminderDigest } from "@/lib/email/reminder-digest";
import { AUTO_REMINDER_KINDS } from "@/lib/reminders/plan";
import { syncAutoReminders } from "@/lib/reminders/sync";
import { sendEmail } from "@/server/email/send";

/** Reminders that fell due longer ago than this are shown in the app but never emailed. */
const EMAIL_WINDOW_HOURS = 48;
const BATCH = 1000;
export const DEMO_ACCOUNT_HOURS = 24;

type Claimed = {
  id: string;
  userId: string;
  title: string;
  applicationId: string | null;
  dueAt: Date;
};

export type ReminderJobResult = {
  demoAccountsDeleted: number;
  resynced: number;
  notified: number;
  emailsSent: number;
  emailsFailed: number;
  errors: string[];
};

/**
 * One run of the reminders cron. Safe to run twice at once or back to back: each step claims
 * rows with UPDATE … RETURNING (FOR UPDATE SKIP LOCKED), so nothing is notified or emailed twice.
 */
export async function runReminderJob(now: Date = new Date()): Promise<ReminderJobResult> {
  const result: ReminderJobResult = {
    demoAccountsDeleted: 0,
    resynced: 0,
    notified: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
  };

  // 0. "Try the demo" accounts live for 24 hours; deleting the user cascades to all their data.
  const { count: demoAccountsDeleted } = await db.user.deleteMany({
    where: {
      isDemo: true,
      createdAt: { lt: new Date(now.getTime() - DEMO_ACCOUNT_HOURS * 3_600_000) },
    },
  });
  result.demoAccountsDeleted = demoAccountsDeleted;

  // 1. Re-plan automatic reminders that are about to fire. Time alone can make one obsolete
  //    (the closing date passed, the interview happened) without any edit triggering a sync.
  const due = await db.reminder.findMany({
    where: {
      dueAt: { lte: now },
      notifiedAt: null,
      completedAt: null,
      dismissedAt: null,
      kind: { in: [...AUTO_REMINDER_KINDS] },
      applicationId: { not: null },
    },
    distinct: ["applicationId"],
    select: { userId: true, applicationId: true },
  });
  for (const r of due) {
    await db.$transaction((tx) => syncAutoReminders(tx, r.userId, r.applicationId!, now));
    result.resynced++;
  }

  // 2. In-app notifications for everything now due. Claim and create in one transaction: if
  //    creating the notifications fails, the claim rolls back and the next run retries.
  const notified = await db.$transaction(async (tx) => {
    const claimed = await tx.$queryRaw<Claimed[]>(Prisma.sql`
      UPDATE "Reminder" SET "notifiedAt" = ${now}
      WHERE id IN (
        SELECT id FROM "Reminder"
        WHERE "dueAt" <= ${now} AND "notifiedAt" IS NULL
          AND "completedAt" IS NULL AND "dismissedAt" IS NULL
        ORDER BY "dueAt"
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, "userId", title, "applicationId", "dueAt"`);
    if (claimed.length) {
      await tx.notification.createMany({
        data: claimed.map((r) => ({
          userId: r.userId,
          reminderId: r.id,
          message: r.title,
          createdAt: now,
        })),
      });
    }
    return claimed;
  });
  result.notified = notified.length;

  // 3. Email: claim notified-but-unemailed reminders for people who want email. This also retries
  //    sends that failed on an earlier run, as long as they're still inside the window.
  const windowStart = new Date(now.getTime() - EMAIL_WINDOW_HOURS * 3_600_000);
  const toEmail = await db.$queryRaw<Claimed[]>(Prisma.sql`
    UPDATE "Reminder" SET "emailedAt" = ${now}
    WHERE id IN (
      SELECT r.id FROM "Reminder" r
      JOIN "User" u ON u.id = r."userId"
      WHERE r."notifiedAt" IS NOT NULL AND r."emailedAt" IS NULL
        AND r."completedAt" IS NULL AND r."dismissedAt" IS NULL
        AND r."dueAt" <= ${now} AND r."dueAt" > ${windowStart}
        AND u."emailRemindersEnabled" = true
      ORDER BY r."dueAt"
      LIMIT ${BATCH}
      FOR UPDATE OF r SKIP LOCKED
    )
    RETURNING id, "userId", title, "applicationId", "dueAt"`);

  const byUser = new Map<string, Claimed[]>();
  for (const r of toEmail) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  const users = await db.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, email: true, name: true },
  });
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  // 4. One email per person. On failure, release the claim so the next run retries.
  for (const user of users) {
    const reminders = byUser.get(user.id)!.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    const ids = reminders.map((r) => r.id);
    const email = buildReminderDigest({ name: user.name, reminders, appUrl });
    const sent = await sendEmail({
      to: user.email,
      ...email,
      idempotencyKey: `reminders-${createHash("sha256").update(ids.sort().join(",")).digest("hex").slice(0, 32)}`,
    }).catch((error: unknown) => ({ ok: false as const, error: String(error) }));

    if (sent.ok) {
      result.emailsSent++;
    } else {
      result.emailsFailed++;
      result.errors.push(`user ${user.id}: ${sent.error}`);
      await db.reminder.updateMany({ where: { id: { in: ids } }, data: { emailedAt: null } });
    }
  }

  return result;
}

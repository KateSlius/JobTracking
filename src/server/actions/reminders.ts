"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calendarDateToIso, londonToday, londonWallTimeToUtc } from "@/lib/format";
import { REMINDER_TIME } from "@/lib/reminders/plan";
import {
  parseReminderForm,
  type ReminderField,
  type ReminderFormValues,
} from "@/lib/validation/reminder";

// Every action re-checks the session, and every write is scoped by userId.

export type ReminderFormState = {
  errors?: Partial<Record<ReminderField, string>>;
  values?: ReminderFormValues;
  message?: string;
  savedAt?: number;
};

export async function createReminderAction(
  _prev: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const user = await requireUser();
  const parsed = parseReminderForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const { applicationId } = parsed.data;
  if (applicationId) {
    const owned = await db.application.count({ where: { id: applicationId, userId: user.id } });
    if (!owned) return { values: parsed.values, message: "That application no longer exists." };
  }

  await db.reminder.create({
    data: {
      userId: user.id,
      applicationId,
      kind: "CUSTOM",
      title: parsed.data.title,
      dueAt: parsed.data.dueAt,
    },
  });
  refresh();
  return { savedAt: Date.now() };
}

async function updateOwn(id: string, data: Parameters<typeof db.reminder.updateMany>[0]["data"]) {
  const user = await requireUser();
  await db.reminder.updateMany({ where: { id, userId: user.id }, data });
  refresh();
}

export async function completeReminderAction(id: string) {
  await updateOwn(id, { completedAt: new Date() });
}

export async function reopenReminderAction(id: string) {
  await updateOwn(id, { completedAt: null, dismissedAt: null });
}

/** Automatic reminders are dismissed rather than deleted, so a re-sync doesn't bring them back. */
export async function dismissReminderAction(id: string) {
  await updateOwn(id, { dismissedAt: new Date() });
}

/** Until 09:00 tomorrow (London). Clears the sent flags so it notifies again then. */
export async function snoozeReminderAction(id: string) {
  const tomorrow = new Date(londonToday().getTime() + 86_400_000);
  await updateOwn(id, {
    dueAt: londonWallTimeToUtc(calendarDateToIso(tomorrow), REMINDER_TIME),
    notifiedAt: null,
    emailedAt: null,
  });
}

/** Only custom reminders can be deleted; automatic ones are dismissed instead. */
export async function deleteReminderAction(id: string) {
  const user = await requireUser();
  await db.reminder.deleteMany({ where: { id, userId: user.id, kind: "CUSTOM" } });
  refresh();
}

export async function setEmailRemindersAction(enabled: boolean) {
  const user = await requireUser();
  if (user.isDemo) return; // demo addresses can't receive email
  await db.user.update({ where: { id: user.id }, data: { emailRemindersEnabled: enabled } });
  refresh();
}

export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  refresh();
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  refresh();
}

import "server-only";
import { db } from "@/lib/db";
import { syncAutoReminders } from "@/lib/reminders/sync";
import type { InterviewInput } from "@/lib/validation/interview";

export class InterviewNotFoundError extends Error {
  constructor() {
    super("Interview not found");
  }
}

// Ownership goes through the parent application: an interview is the user's if its application is.
// Every write re-syncs the application's prep reminders in the same transaction.

export async function createInterview(
  userId: string,
  applicationId: string,
  input: InterviewInput,
) {
  return db.$transaction(async (tx) => {
    const app = await tx.application.findFirst({
      where: { id: applicationId, userId },
      select: { id: true },
    });
    if (!app) throw new InterviewNotFoundError();
    const interview = await tx.interview.create({
      data: { ...input, applicationId },
      select: { id: true },
    });
    await syncAutoReminders(tx, userId, applicationId);
    return interview;
  });
}

/** Bumps icsSequence so calendars that re-import the .ics treat it as an update. */
export async function updateInterview(userId: string, id: string, input: InterviewInput) {
  await db.$transaction(async (tx) => {
    const existing = await tx.interview.findFirst({
      where: { id, application: { userId } },
      select: { applicationId: true },
    });
    if (!existing) throw new InterviewNotFoundError();
    await tx.interview.update({
      where: { id },
      data: { ...input, icsSequence: { increment: 1 } },
    });
    await syncAutoReminders(tx, userId, existing.applicationId);
  });
}

export async function deleteInterview(userId: string, id: string) {
  await db.$transaction(async (tx) => {
    const existing = await tx.interview.findFirst({
      where: { id, application: { userId } },
      select: { applicationId: true },
    });
    if (!existing) throw new InterviewNotFoundError();
    // The interview's own prep reminders cascade-delete with it.
    await tx.interview.delete({ where: { id } });
    await syncAutoReminders(tx, userId, existing.applicationId);
  });
}

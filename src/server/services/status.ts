import "server-only";
import type { ApplicationStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { londonToday } from "@/lib/format";
import { STATUS_ORDER } from "@/lib/constants";

/**
 * The only place an application's status changes. Every change writes a StatusChange row in the
 * same transaction; the timeline, funnel chart and response rate all read from that history.
 */

/** Statuses that mean the person has actually applied (used to auto-fill appliedOn). */
export function impliesApplied(status: ApplicationStatus): boolean {
  return status !== "SAVED" && status !== "WITHDRAWN" && STATUS_ORDER.includes(status);
}

/** Call inside the transaction that creates an application. */
export async function recordInitialStatus(
  tx: Prisma.TransactionClient,
  applicationId: string,
  status: ApplicationStatus,
) {
  await tx.statusChange.create({
    data: { applicationId, fromStatus: null, toStatus: status },
  });
}

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("Application not found");
  }
}

export async function changeStatus({
  userId,
  applicationId,
  toStatus,
  note,
  now = new Date(),
}: {
  userId: string;
  applicationId: string;
  toStatus: ApplicationStatus;
  note?: string | null;
  now?: Date;
}): Promise<{ changed: boolean }> {
  return db.$transaction(async (tx) => {
    // Scoping by userId is the authorisation check: another user's id simply isn't found.
    const app = await tx.application.findFirst({
      where: { id: applicationId, userId },
      select: { status: true, appliedOn: true },
    });
    if (!app) throw new ApplicationNotFoundError();
    if (app.status === toStatus) return { changed: false };

    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: toStatus,
        ...(impliesApplied(toStatus) && !app.appliedOn ? { appliedOn: londonToday(now) } : {}),
      },
    });
    await tx.statusChange.create({
      data: {
        applicationId,
        fromStatus: app.status,
        toStatus,
        changedAt: now,
        note: note?.trim() || null,
      },
    });
    return { changed: true };
  });
}

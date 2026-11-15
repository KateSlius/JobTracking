import "server-only";
import { db } from "@/lib/db";
import type { InterviewInput } from "@/lib/validation/interview";

export class InterviewNotFoundError extends Error {
  constructor() {
    super("Interview not found");
  }
}

/** Ownership goes through the parent application: an interview is the user's if its application is. */
function ownedBy(userId: string) {
  return { application: { userId } };
}

export async function createInterview(
  userId: string,
  applicationId: string,
  input: InterviewInput,
) {
  const app = await db.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });
  if (!app) throw new InterviewNotFoundError();
  return db.interview.create({ data: { ...input, applicationId }, select: { id: true } });
}

/** Bumps icsSequence so calendars that re-import the .ics treat it as an update. */
export async function updateInterview(userId: string, id: string, input: InterviewInput) {
  const { count } = await db.interview.updateMany({
    where: { id, ...ownedBy(userId) },
    data: { ...input, icsSequence: { increment: 1 } },
  });
  if (count === 0) throw new InterviewNotFoundError();
}

export async function deleteInterview(userId: string, id: string) {
  const { count } = await db.interview.deleteMany({ where: { id, ...ownedBy(userId) } });
  if (count === 0) throw new InterviewNotFoundError();
}

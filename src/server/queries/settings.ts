import "server-only";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getSettings() {
  const user = await requireUser();
  const [profile, documents] = await db.$transaction([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        emailRemindersEnabled: true,
        createdAt: true,
        accounts: { select: { provider: true } },
      },
    }),
    db.documentVersion.findMany({
      where: { userId: user.id },
      orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        kind: true,
        label: true,
        _count: { select: { cvApplications: true, coverLetterApplications: true } },
      },
    }),
  ]);
  return { profile, documents, isDemo: user.isDemo };
}

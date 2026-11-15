import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PAGE_SIZE, type ApplicationFilters, type SortKey } from "@/lib/validation/filters";

// Read side. Each exported query resolves the user itself, so callers can't ask for
// someone else's data by passing an id. Callers render inside <Suspense> (reads cookies).

function orderBy(sort: SortKey, dir: "asc" | "desc"): Prisma.ApplicationOrderByWithRelationInput[] {
  const tiebreak = { id: "asc" } as const;
  switch (sort) {
    case "closing":
      return [{ closingDate: { sort: dir, nulls: "last" } }, tiebreak];
    case "applied":
      return [{ appliedOn: { sort: dir, nulls: "last" } }, tiebreak];
    case "company":
      return [{ company: { name: dir } }, { roleTitle: "asc" }, tiebreak];
    case "role":
      return [{ roleTitle: dir }, tiebreak];
    case "updated":
    default:
      return [{ updatedAt: dir }, tiebreak];
  }
}

export async function listApplications(filters: ApplicationFilters) {
  const user = await requireUser();

  const where: Prisma.ApplicationWhereInput = {
    userId: user.id,
    archivedAt: null,
    ...(filters.status.length ? { status: { in: filters.status } } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.location ? { locationType: filters.location } : {}),
    ...(filters.q
      ? {
          OR: [
            { roleTitle: { contains: filters.q, mode: "insensitive" } },
            { company: { name: { contains: filters.q, mode: "insensitive" } } },
            { city: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await db.$transaction([
    db.application.count({ where }),
    db.application.findMany({
      where,
      orderBy: orderBy(filters.sort, filters.dir),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        roleTitle: true,
        status: true,
        locationType: true,
        city: true,
        salaryMinPence: true,
        salaryMaxPence: true,
        salaryPeriod: true,
        closingDate: true,
        appliedOn: true,
        updatedAt: true,
        company: { select: { name: true } },
      },
    }),
  ]);

  return { rows, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type ApplicationListRow = Awaited<ReturnType<typeof listApplications>>["rows"][number];

export async function getApplication(id: string) {
  const user = await requireUser();
  return db.application.findFirst({
    where: { id, userId: user.id },
    include: {
      company: { select: { name: true } },
      contact: { select: { name: true, email: true, phone: true, agencyName: true } },
      cvVersion: { select: { label: true } },
      coverLetterVersion: { select: { label: true } },
      statusChanges: { orderBy: { changedAt: "desc" } },
    },
  });
}

export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplication>>>;

/** Suggestions for the form's company and CV/cover letter fields. */
export async function getFormSuggestions() {
  const user = await requireUser();
  const [companies, documents] = await db.$transaction([
    db.company.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { name: true },
      take: 500,
    }),
    db.documentVersion.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { kind: true, label: true },
    }),
  ]);
  return {
    companies: companies.map((c) => c.name),
    cvVersions: documents.filter((d) => d.kind === "CV").map((d) => d.label),
    coverLetterVersions: documents.filter((d) => d.kind === "COVER_LETTER").map((d) => d.label),
  };
}

export type FormSuggestions = Awaited<ReturnType<typeof getFormSuggestions>>;

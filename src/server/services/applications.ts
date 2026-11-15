import "server-only";
import type { DocumentKind, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { londonToday } from "@/lib/format";
import type { ApplicationInput } from "@/lib/validation/application";
import { ApplicationNotFoundError, impliesApplied, recordInitialStatus } from "./status";

type Tx = Prisma.TransactionClient;

/** Companies are per user and matched case-insensitively, so "monzo" reuses "Monzo". */
async function findOrCreateCompany(tx: Tx, userId: string, name: string) {
  const existing = await tx.company.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.company.create({ data: { userId, name }, select: { id: true } });
  return created.id;
}

async function findOrCreateDocumentVersion(
  tx: Tx,
  userId: string,
  kind: DocumentKind,
  label: string | null,
) {
  if (!label) return null;
  const doc = await tx.documentVersion.upsert({
    where: { userId_kind_label: { userId, kind, label } },
    create: { userId, kind, label },
    update: {},
    select: { id: true },
  });
  return doc.id;
}

/** Updates the application's existing contact in place, or creates one. */
async function saveContact(
  tx: Tx,
  userId: string,
  companyId: string,
  existingContactId: string | null,
  contact: ApplicationInput["contact"],
) {
  if (!contact) return null;
  const data = {
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    agencyName: contact.agencyName,
  };
  if (existingContactId) {
    await tx.contact.update({ where: { id: existingContactId, userId }, data });
    return existingContactId;
  }
  const created = await tx.contact.create({
    data: { ...data, userId, companyId, role: "RECRUITER" },
    select: { id: true },
  });
  return created.id;
}

/** Fields that map 1:1 from validated input to the Application row. */
function scalarFields(input: ApplicationInput) {
  return {
    roleTitle: input.roleTitle,
    jobUrl: input.jobUrl,
    source: input.source,
    sourceOther: input.sourceOther,
    locationType: input.locationType,
    city: input.city,
    salaryMinPence: input.salaryMinPence,
    salaryMaxPence: input.salaryMaxPence,
    salaryPeriod: input.salaryPeriod,
    contractType: input.contractType,
    ir35Status: input.ir35Status,
    visaSponsorshipRequired: input.visaSponsorshipRequired,
    closingDate: input.closingDate,
    notes: input.notes,
  };
}

export async function createApplication(userId: string, input: ApplicationInput) {
  return db.$transaction(async (tx) => {
    const companyId = await findOrCreateCompany(tx, userId, input.companyName);
    const contactId = await saveContact(tx, userId, companyId, null, input.contact);
    // Sequential on purpose: a transaction has one connection.
    const cvVersionId = await findOrCreateDocumentVersion(tx, userId, "CV", input.cvVersion);
    const coverLetterVersionId = await findOrCreateDocumentVersion(
      tx,
      userId,
      "COVER_LETTER",
      input.coverLetterVersion,
    );

    const app = await tx.application.create({
      data: {
        ...scalarFields(input),
        userId,
        companyId,
        contactId,
        cvVersionId,
        coverLetterVersionId,
        status: input.status,
        appliedOn: input.appliedOn ?? (impliesApplied(input.status) ? londonToday() : null),
      },
      select: { id: true },
    });
    await recordInitialStatus(tx, app.id, input.status);
    return app;
  });
}

/** Status is not edited here: it goes through changeStatus() so history is recorded. */
export async function updateApplication(userId: string, id: string, input: ApplicationInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.application.findFirst({
      where: { id, userId },
      select: { contactId: true },
    });
    if (!existing) throw new ApplicationNotFoundError();

    const companyId = await findOrCreateCompany(tx, userId, input.companyName);
    const contactId = await saveContact(tx, userId, companyId, existing.contactId, input.contact);
    // Sequential on purpose: a transaction has one connection.
    const cvVersionId = await findOrCreateDocumentVersion(tx, userId, "CV", input.cvVersion);
    const coverLetterVersionId = await findOrCreateDocumentVersion(
      tx,
      userId,
      "COVER_LETTER",
      input.coverLetterVersion,
    );

    await tx.application.update({
      where: { id },
      data: {
        ...scalarFields(input),
        companyId,
        contactId,
        cvVersionId,
        coverLetterVersionId,
        appliedOn: input.appliedOn,
      },
    });
  });
}

export async function deleteApplication(userId: string, id: string) {
  const { count } = await db.application.deleteMany({ where: { id, userId } });
  if (count === 0) throw new ApplicationNotFoundError();
}

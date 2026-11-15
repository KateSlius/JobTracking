import "server-only";
import { strToU8, zipSync } from "fflate";
import { db } from "@/lib/db";
import { toCsv, type CsvColumn } from "@/lib/export/csv";

/**
 * UK GDPR: right of access / portability (export) and right to erasure (delete).
 * Sign-in tokens and sessions are deliberately not exported: they are credentials, not
 * information about the person, and would make the file dangerous to share.
 */

async function loadExportData(userId: string) {
  const [user, companies, contacts, applications, reminders, documents, notifications] =
    await db.$transaction([
      db.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          emailVerified: true,
          timezone: true,
          emailRemindersEnabled: true,
          createdAt: true,
          accounts: { select: { provider: true, createdAt: true } },
        },
      }),
      db.company.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      db.contact.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      db.application.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        include: {
          company: { select: { name: true } },
          contact: { select: { name: true } },
          cvVersion: { select: { label: true } },
          coverLetterVersion: { select: { label: true } },
          statusChanges: { orderBy: { changedAt: "asc" } },
          interviews: { orderBy: { startsAt: "asc" } },
        },
      }),
      db.reminder.findMany({ where: { userId }, orderBy: { dueAt: "asc" } }),
      db.documentVersion.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      db.notification.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    ]);
  return { user, companies, contacts, applications, reminders, documents, notifications };
}

type ExportData = Awaited<ReturnType<typeof loadExportData>>;
type App = ExportData["applications"][number];

const pounds = (pence: number | null) => (pence == null ? null : pence / 100);
const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const README = `Your Job Tracker data
=====================

Exported {{when}} (UTC).

data.json         Everything below in one file, for importing elsewhere.
applications.csv  One row per application. Salaries are in pounds (GBP).
status_history.csv  Every status change, oldest first.
interviews.csv    Interviews. Times are UTC; the "uk_time" column shows them in UK time.
reminders.csv     Automatic and custom reminders.
contacts.csv, companies.csv, documents.csv, notifications.csv, profile.csv

Date formats: dates are YYYY-MM-DD, times are ISO 8601 in UTC (e.g. 2026-11-18T10:00:00.000Z),
so spreadsheets and other apps read them correctly.

Text cells that start with = + - or @ have an apostrophe added so spreadsheets don't run them
as formulas.

Not included: sign-in tokens and active sessions. They are security credentials, not information
about you.
`;

function ukTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

const applicationColumns: CsvColumn<App>[] = [
  { header: "id", value: (a) => a.id },
  { header: "company", value: (a) => a.company.name },
  { header: "role", value: (a) => a.roleTitle },
  { header: "status", value: (a) => a.status },
  { header: "job_url", value: (a) => a.jobUrl },
  { header: "source", value: (a) => a.source },
  { header: "source_other", value: (a) => a.sourceOther },
  { header: "work_pattern", value: (a) => a.locationType },
  { header: "city", value: (a) => a.city },
  { header: "salary_min_gbp", value: (a) => pounds(a.salaryMinPence) },
  { header: "salary_max_gbp", value: (a) => pounds(a.salaryMaxPence) },
  { header: "salary_period", value: (a) => a.salaryPeriod },
  { header: "contract_type", value: (a) => a.contractType },
  { header: "ir35_status", value: (a) => a.ir35Status },
  { header: "visa_sponsorship_required", value: (a) => a.visaSponsorshipRequired },
  { header: "closing_date", value: (a) => isoDate(a.closingDate) },
  { header: "applied_on", value: (a) => isoDate(a.appliedOn) },
  { header: "contact", value: (a) => a.contact?.name },
  { header: "cv_version", value: (a) => a.cvVersion?.label },
  { header: "cover_letter_version", value: (a) => a.coverLetterVersion?.label },
  { header: "notes", value: (a) => a.notes },
  { header: "created_at", value: (a) => a.createdAt },
  { header: "updated_at", value: (a) => a.updatedAt },
];

export async function buildExportZip(userId: string, now: Date = new Date()): Promise<Uint8Array> {
  const d = await loadExportData(userId);
  const label = (applicationId: string | null) => {
    const app = d.applications.find((a) => a.id === applicationId);
    return app ? `${app.roleTitle} – ${app.company.name}` : null;
  };

  const statusHistory = d.applications.flatMap((a) =>
    a.statusChanges.map((s) => ({ ...s, label: `${a.roleTitle} – ${a.company.name}` })),
  );
  const interviews = d.applications.flatMap((a) =>
    a.interviews.map((i) => ({ ...i, label: `${a.roleTitle} – ${a.company.name}` })),
  );

  const files: Record<string, string> = {
    "README.txt": README.replace("{{when}}", now.toISOString()),
    "data.json": JSON.stringify(
      {
        exportedAt: now.toISOString(),
        profile: d.user,
        companies: d.companies,
        contacts: d.contacts,
        applications: d.applications,
        reminders: d.reminders,
        documents: d.documents,
        notifications: d.notifications,
      },
      null,
      2,
    ),
    "profile.csv": toCsv(
      [d.user],
      [
        { header: "name", value: (u) => u.name },
        { header: "email", value: (u) => u.email },
        { header: "email_verified", value: (u) => u.emailVerified },
        { header: "timezone", value: (u) => u.timezone },
        { header: "email_reminders", value: (u) => u.emailRemindersEnabled },
        { header: "sign_in_methods", value: (u) => u.accounts.map((a) => a.provider).join(" ") },
        { header: "created_at", value: (u) => u.createdAt },
      ],
    ),
    "applications.csv": toCsv(d.applications, applicationColumns),
    "status_history.csv": toCsv(statusHistory, [
      { header: "application", value: (s) => s.label },
      { header: "application_id", value: (s) => s.applicationId },
      { header: "from_status", value: (s) => s.fromStatus },
      { header: "to_status", value: (s) => s.toStatus },
      { header: "changed_at", value: (s) => s.changedAt },
      { header: "note", value: (s) => s.note },
    ]),
    "interviews.csv": toCsv(interviews, [
      { header: "application", value: (i) => i.label },
      { header: "application_id", value: (i) => i.applicationId },
      { header: "type", value: (i) => i.type },
      { header: "stage", value: (i) => i.stage },
      { header: "starts_at", value: (i) => i.startsAt },
      { header: "ends_at", value: (i) => i.endsAt },
      { header: "uk_time", value: (i) => ukTime(i.startsAt) },
      { header: "location", value: (i) => i.location },
      { header: "meeting_url", value: (i) => i.meetingUrl },
      { header: "interviewers", value: (i) => i.interviewers },
      { header: "prep_notes", value: (i) => i.prepNotes },
      { header: "outcome", value: (i) => i.outcome },
    ]),
    "reminders.csv": toCsv(d.reminders, [
      { header: "title", value: (r) => r.title },
      { header: "kind", value: (r) => r.kind },
      { header: "application", value: (r) => label(r.applicationId) },
      { header: "due_at", value: (r) => r.dueAt },
      { header: "completed_at", value: (r) => r.completedAt },
      { header: "dismissed_at", value: (r) => r.dismissedAt },
      { header: "emailed_at", value: (r) => r.emailedAt },
    ]),
    "contacts.csv": toCsv(d.contacts, [
      { header: "name", value: (c) => c.name },
      { header: "role", value: (c) => c.role },
      { header: "agency", value: (c) => c.agencyName },
      { header: "email", value: (c) => c.email },
      { header: "phone", value: (c) => c.phone },
      { header: "linkedin", value: (c) => c.linkedinUrl },
    ]),
    "companies.csv": toCsv(d.companies, [
      { header: "name", value: (c) => c.name },
      { header: "website", value: (c) => c.website },
      { header: "notes", value: (c) => c.notes },
    ]),
    "documents.csv": toCsv(d.documents, [
      { header: "kind", value: (x) => x.kind },
      { header: "label", value: (x) => x.label },
      { header: "created_at", value: (x) => x.createdAt },
    ]),
    "notifications.csv": toCsv(d.notifications, [
      { header: "message", value: (n) => n.message },
      { header: "created_at", value: (n) => n.createdAt },
      { header: "read_at", value: (n) => n.readAt },
    ]),
  };

  return zipSync(
    Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])),
    { level: 6 },
  );
}

/**
 * Deletes the user and everything they own. One DELETE on "User" cascades to accounts, sessions,
 * companies, contacts, applications (and their history, interviews, reminders), documents and
 * notifications. Application→Company is NO ACTION (checked at the end of the statement), so the
 * cascade completes. Unused magic-link tokens for the address are removed too.
 */
export async function deleteAccount(
  userId: string,
): Promise<{ email: string; name: string | null }> {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, name: true },
    });
    await tx.user.delete({ where: { id: userId } });
    await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
    return user;
  });
}

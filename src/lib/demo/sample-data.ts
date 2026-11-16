/**
 * The sample job search used by `npx prisma db seed` (demo@example.com) and by the "Try the demo"
 * button (one private copy per visitor). Dates are relative to now, so it always looks current.
 * Takes the client as an argument (no "server-only"), so the seed script can use it too.
 */
import { TZDate } from "@date-fns/tz";
import type { ApplicationStatus, InterviewType, Prisma } from "@/generated/prisma/client";
import { syncAutoReminders } from "@/lib/reminders/sync";

type Db = Prisma.TransactionClient;

const DAY = 86_400_000;

/** Calendar date N days from today (UTC midnight), for `date` columns. */
function calendarDays(offset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
}

type SeedApp = {
  company: string;
  role: string;
  /** Status path, oldest first. Each step happens `stepDays` after the previous one. */
  path: ApplicationStatus[];
  startedDaysAgo: number;
  stepDays?: number;
  closingInDays?: number;
  data?: Partial<Prisma.ApplicationUncheckedCreateInput>;
  contact?: { name: string; email?: string; phone?: string; agencyName?: string };
  cv?: string;
  /** An interview N days from today at a London wall-clock hour. */
  interview?: {
    inDays: number;
    hour: number;
    type: InterviewType;
    stage: string;
    location?: string;
    outcome?: string;
  };
};

/** N days from today at hh:00 London time (BST-aware), as a UTC instant. */
function londonAt(inDays: number, hour: number): Date {
  const today = calendarDays(inDays);
  return new Date(
    new TZDate(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      hour,
      0,
      "Europe/London",
    ).getTime(),
  );
}

export const SAMPLE_APPLICATIONS: SeedApp[] = [
  {
    company: "Monzo",
    role: "Senior Backend Engineer",
    path: ["SAVED", "APPLIED", "INTERVIEW"],
    startedDaysAgo: 24,
    stepDays: 6,
    data: {
      source: "LINKEDIN",
      locationType: "HYBRID",
      city: "London",
      salaryMinPence: 8_000_000,
      salaryMaxPence: 9_500_000,
      contractType: "PERMANENT",
    },
    contact: { name: "Priya Shah", email: "priya.shah@example.com" },
    cv: "CV v3 – Backend",
    interview: { inDays: 3, hour: 10, type: "VIDEO", stage: "2nd round – system design" },
  },
  {
    company: "Octopus Energy",
    role: "Platform Engineer",
    path: ["APPLIED", "ASSESSMENT"],
    startedDaysAgo: 12,
    stepDays: 5,
    data: {
      source: "COMPANY_SITE",
      locationType: "HYBRID",
      city: "London",
      salaryMinPence: 6_500_000,
      salaryMaxPence: 7_500_000,
      contractType: "PERMANENT",
    },
    cv: "CV v3 – Backend",
  },
  {
    company: "HMRC",
    role: "Senior Software Developer (G7)",
    path: ["SAVED"],
    startedDaysAgo: 3,
    closingInDays: 2,
    data: {
      source: "CIVIL_SERVICE_JOBS",
      locationType: "HYBRID",
      city: "Newcastle upon Tyne",
      salaryMinPence: 5_400_000,
      salaryMaxPence: 6_200_000,
      contractType: "PERMANENT",
      notes: "Success profiles: behaviours + technical. 750-word personal statement.",
    },
  },
  {
    company: "Hays Technology",
    role: "Python Developer (Contract)",
    path: ["APPLIED", "INTERVIEW", "OFFER"],
    startedDaysAgo: 20,
    stepDays: 6,
    data: {
      source: "AGENCY",
      locationType: "REMOTE",
      salaryMinPence: 55_000,
      salaryMaxPence: 60_000,
      salaryPeriod: "DAY",
      contractType: "CONTRACT",
      ir35Status: "OUTSIDE",
    },
    contact: {
      name: "Tom Fletcher",
      agencyName: "Hays",
      phone: "0161 496 0000",
      email: "tom.fletcher@example.com",
    },
  },
  {
    company: "Deliveroo",
    role: "Software Engineer II",
    path: ["APPLIED", "REJECTED"],
    startedDaysAgo: 30,
    stepDays: 9,
    data: {
      source: "LINKEDIN",
      locationType: "HYBRID",
      city: "London",
      salaryMinPence: 6_000_000,
      salaryMaxPence: 7_000_000,
      contractType: "PERMANENT",
    },
  },
  {
    company: "Skyscanner",
    role: "Full Stack Engineer",
    path: ["APPLIED"],
    startedDaysAgo: 9,
    data: {
      source: "INDEED_UK",
      locationType: "HYBRID",
      city: "Edinburgh",
      salaryMinPence: 5_500_000,
      salaryMaxPence: 6_500_000,
      contractType: "PERMANENT",
      visaSponsorshipRequired: true,
    },
    cv: "CV v2 – Full stack",
  },
  {
    company: "BBC",
    role: "Senior Software Engineer, iPlayer",
    path: ["APPLIED", "ASSESSMENT", "INTERVIEW"],
    startedDaysAgo: 18,
    stepDays: 5,
    data: {
      source: "COMPANY_SITE",
      locationType: "HYBRID",
      city: "Salford",
      salaryMinPence: 5_800_000,
      salaryMaxPence: 6_800_000,
      contractType: "PERMANENT",
    },
    interview: {
      inDays: -5,
      hour: 14,
      type: "IN_PERSON",
      stage: "Panel interview",
      location: "BBC Bridge House, MediaCityUK, Salford M50 2BH",
      outcome: "Went well – asked about accessibility work. Expect to hear within a week.",
    },
  },
  {
    company: "NHS England",
    role: "Lead Developer",
    path: ["SAVED"],
    startedDaysAgo: 1,
    closingInDays: 10,
    data: {
      source: "OTHER",
      sourceOther: "NHS Jobs",
      locationType: "REMOTE",
      salaryMinPence: 6_700_000,
      salaryMaxPence: 7_700_000,
      contractType: "PERMANENT",
      notes: "Band 8a.",
    },
  },
  {
    company: "Wise",
    role: "Backend Engineer – Payments",
    path: ["APPLIED", "WITHDRAWN"],
    startedDaysAgo: 26,
    stepDays: 8,
    data: {
      source: "REFERRAL",
      locationType: "HYBRID",
      city: "London",
      contractType: "PERMANENT",
      notes: "Withdrew: on-site 4 days a week.",
    },
  },
  {
    company: "Sainsbury's Tech",
    role: "Engineering Manager",
    path: ["SAVED"],
    startedDaysAgo: 5,
    closingInDays: -1,
    data: {
      source: "TOTALJOBS",
      locationType: "HYBRID",
      city: "Coventry",
      salaryMinPence: 8_500_000,
      contractType: "PERMANENT",
    },
  },
  {
    company: "Arm",
    role: "Software Engineer, Developer Tools",
    path: ["APPLIED"],
    startedDaysAgo: 4,
    data: {
      source: "REED",
      locationType: "ONSITE",
      city: "Cambridge",
      salaryMinPence: 6_000_000,
      salaryMaxPence: 7_200_000,
      contractType: "PERMANENT",
    },
    cv: "CV v3 – Backend",
  },
  {
    company: "Ministry of Justice",
    role: "DevOps Engineer",
    path: ["APPLIED", "REJECTED"],
    startedDaysAgo: 40,
    stepDays: 14,
    data: {
      source: "CIVIL_SERVICE_JOBS",
      locationType: "HYBRID",
      city: "Leeds",
      salaryMinPence: 4_800_000,
      salaryMaxPence: 5_500_000,
      contractType: "FIXED_TERM",
    },
  },
];

/** Adds the sample applications, interviews and reminders to an existing (empty) user. */
export async function addSampleData(db: Db, userId: string): Promise<void> {
  for (const seed of SAMPLE_APPLICATIONS) {
    const company = await db.company.upsert({
      where: { userId_name: { userId: userId, name: seed.company } },
      create: { userId: userId, name: seed.company },
      update: {},
    });
    const contact = seed.contact
      ? await db.contact.create({
          data: { ...seed.contact, userId: userId, companyId: company.id },
        })
      : null;
    const cv = seed.cv
      ? await db.documentVersion.upsert({
          where: { userId_kind_label: { userId: userId, kind: "CV", label: seed.cv } },
          create: { userId: userId, kind: "CV", label: seed.cv },
          update: {},
        })
      : null;

    const step = seed.stepDays ?? 3;
    const changes = seed.path.map((status, i) => {
      const daysAgo = Math.max(0, seed.startedDaysAgo - i * step);
      return { status, daysAgo, at: new Date(Date.now() - daysAgo * DAY) };
    });
    const firstApplied = changes.find((c) => c.status !== "SAVED" && c.status !== "WITHDRAWN");
    const last = changes[changes.length - 1];

    const created = await db.application.create({
      data: {
        userId: userId,
        companyId: company.id,
        contactId: contact?.id,
        cvVersionId: cv?.id,
        roleTitle: seed.role,
        status: last.status,
        appliedOn: firstApplied ? calendarDays(-firstApplied.daysAgo) : null,
        closingDate: seed.closingInDays != null ? calendarDays(seed.closingInDays) : null,
        createdAt: changes[0].at,
        ...seed.data,
        statusChanges: {
          create: changes.map((c, i) => ({
            fromStatus: i === 0 ? null : changes[i - 1].status,
            toStatus: c.status,
            changedAt: c.at,
          })),
        },
      },
    });

    if (seed.interview) {
      const startsAt = londonAt(seed.interview.inDays, seed.interview.hour);
      await db.interview.create({
        data: {
          applicationId: created.id,
          type: seed.interview.type,
          stage: seed.interview.stage,
          location: seed.interview.location,
          outcome: seed.interview.outcome,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        },
      });
    }
    // Same rules as the app: closing-date, follow-up and interview-prep reminders.
    await syncAutoReminders(db, userId, created.id);
  }

  // One custom reminder, so the reminders page shows both kinds.
  await db.reminder.create({
    data: {
      userId: userId,
      kind: "CUSTOM",
      title: "Update LinkedIn headline",
      dueAt: londonAt(1, 18),
    },
  });
}

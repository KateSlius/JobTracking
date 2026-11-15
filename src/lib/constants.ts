/**
 * Display labels and ordering for enums. Safe to import from client components:
 * `@/generated/prisma/enums` has no runtime dependencies on the database client.
 */
import {
  ApplicationStatus,
  ContractType,
  Ir35Status,
  JobSource,
  LocationType,
  SalaryPeriod,
} from "@/generated/prisma/enums";

export { ApplicationStatus, ContractType, Ir35Status, JobSource, LocationType, SalaryPeriod };

/** Pipeline order, used for the status picker, filters, Kanban columns and the funnel. */
export const STATUS_ORDER = [
  ApplicationStatus.SAVED,
  ApplicationStatus.APPLIED,
  ApplicationStatus.ASSESSMENT,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
] as const satisfies readonly ApplicationStatus[];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

/** Tailwind classes for status badges. Kept as full strings so Tailwind can find them. */
export const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  SAVED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  APPLIED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  ASSESSMENT: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  INTERVIEW: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  OFFER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  WITHDRAWN: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export const SOURCE_LABEL: Record<JobSource, string> = {
  LINKEDIN: "LinkedIn",
  INDEED_UK: "Indeed UK",
  REED: "Reed",
  TOTALJOBS: "Totaljobs",
  CIVIL_SERVICE_JOBS: "Civil Service Jobs",
  AGENCY: "Recruitment agency",
  REFERRAL: "Referral",
  COMPANY_SITE: "Company website",
  OTHER: "Other",
};

export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  PERMANENT: "Permanent",
  FIXED_TERM: "Fixed-term",
  CONTRACT: "Contract",
};

export const IR35_LABEL: Record<Ir35Status, string> = {
  INSIDE: "Inside IR35",
  OUTSIDE: "Outside IR35",
  UNDETERMINED: "IR35 not yet determined",
};

export const SALARY_PERIOD_LABEL: Record<SalaryPeriod, string> = {
  ANNUM: "Per annum",
  DAY: "Day rate",
};

/** Suggestions for the city field. Free text is still allowed. */
export const UK_CITIES = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Glasgow",
  "Edinburgh",
  "Bristol",
  "Liverpool",
  "Newcastle upon Tyne",
  "Sheffield",
  "Nottingham",
  "Leicester",
  "Cardiff",
  "Belfast",
  "Cambridge",
  "Oxford",
  "Reading",
  "Brighton",
  "Southampton",
  "Milton Keynes",
] as const;

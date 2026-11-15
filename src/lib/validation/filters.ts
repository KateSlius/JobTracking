import { ApplicationStatus, JobSource, LocationType } from "@/generated/prisma/enums";

/** Applications list state, kept in the URL so views can be bookmarked and shared. */
export type ApplicationFilters = {
  q: string;
  status: ApplicationStatus[];
  source: JobSource | null;
  location: LocationType | null;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
};

export const SORT_KEYS = ["updated", "closing", "applied", "company", "role"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABEL: Record<SortKey, string> = {
  updated: "Last updated",
  closing: "Closing date",
  applied: "Date applied",
  company: "Company",
  role: "Job title",
};

/** Sensible direction when a sort is first picked: soonest closing first, newest otherwise. */
export const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  updated: "desc",
  closing: "asc",
  applied: "desc",
  company: "asc",
  role: "asc",
};

export const PAGE_SIZE = 25;

const DEFAULTS: ApplicationFilters = {
  q: "",
  status: [],
  source: null,
  location: null,
  sort: "updated",
  dir: "desc",
  page: 1,
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function oneOf<T extends string>(values: readonly T[], v: string | undefined): T | null {
  return v && (values as readonly string[]).includes(v) ? (v as T) : null;
}

/** Lenient: unknown or malformed params fall back to defaults instead of erroring. */
export function parseFilters(params: RawParams): ApplicationFilters {
  const statuses = Object.values(ApplicationStatus);
  const status = (first(params.status) ?? "")
    .split(",")
    .map((s) => oneOf(statuses, s.trim().toUpperCase()))
    .filter((s): s is ApplicationStatus => s !== null);

  const sort = oneOf(SORT_KEYS, first(params.sort)) ?? DEFAULTS.sort;
  const dirParam = first(params.dir);
  const dir = dirParam === "asc" || dirParam === "desc" ? dirParam : DEFAULT_DIR[sort];
  const page = Math.max(1, Math.floor(Number(first(params.page)) || 1));

  return {
    q: (first(params.q) ?? "").trim().slice(0, 100),
    status: [...new Set(status)],
    source: oneOf(Object.values(JobSource), first(params.source)?.toUpperCase()),
    location: oneOf(Object.values(LocationType), first(params.location)?.toUpperCase()),
    sort,
    dir,
    page,
  };
}

/** Inverse of parseFilters. Omits defaults to keep URLs short. */
export function filtersToSearchParams(filters: Partial<ApplicationFilters>): URLSearchParams {
  const f = { ...DEFAULTS, ...filters };
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.status.length) params.set("status", f.status.join(","));
  if (f.source) params.set("source", f.source);
  if (f.location) params.set("location", f.location);
  if (f.sort !== DEFAULTS.sort) params.set("sort", f.sort);
  if (f.dir !== DEFAULT_DIR[f.sort]) params.set("dir", f.dir);
  if (f.page > 1) params.set("page", String(f.page));
  return params;
}

export function hasActiveFilters(f: ApplicationFilters): boolean {
  return Boolean(f.q || f.status.length || f.source || f.location);
}

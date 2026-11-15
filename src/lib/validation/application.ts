import { z } from "zod";
import {
  ApplicationStatus,
  ContractType,
  Ir35Status,
  JobSource,
  LocationType,
  SalaryPeriod,
} from "@/generated/prisma/enums";
import { parseSalary } from "@/lib/salary";
import {
  fieldErrors,
  optionalEmail,
  optionalEnum,
  optionalText,
  text,
  ukDate,
  webUrl,
} from "./shared";

/** Field names used by the application form. Keep in sync with application-form.tsx. */
export const APPLICATION_FIELDS = [
  "companyName",
  "roleTitle",
  "status",
  "jobUrl",
  "source",
  "sourceOther",
  "locationType",
  "city",
  "salaryMin",
  "salaryMax",
  "salaryPeriod",
  "contractType",
  "ir35Status",
  "visaSponsorshipRequired",
  "closingDate",
  "appliedOn",
  "contactName",
  "contactEmail",
  "contactPhone",
  "agencyName",
  "cvVersion",
  "coverLetterVersion",
  "notes",
] as const;

export type ApplicationField = (typeof APPLICATION_FIELDS)[number];
export type ApplicationFormValues = Partial<Record<ApplicationField, string>>;

const salary = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const parsed = parseSalary(v);
    if (parsed === undefined) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 45000, £45k or £500/day." });
      return z.NEVER;
    }
    return parsed;
  });

export const applicationSchema = z
  .object({
    companyName: text(200).min(1, "Enter the company name."),
    roleTitle: text(200).min(1, "Enter the job title."),
    status: z.enum(ApplicationStatus).default("SAVED"),
    jobUrl: webUrl,
    source: optionalEnum(JobSource),
    sourceOther: optionalText(100),
    locationType: optionalEnum(LocationType),
    city: optionalText(100),
    salaryMin: salary,
    salaryMax: salary,
    salaryPeriod: z.enum(SalaryPeriod).default("ANNUM"),
    contractType: optionalEnum(ContractType),
    ir35Status: optionalEnum(Ir35Status),
    visaSponsorshipRequired: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
    closingDate: ukDate,
    appliedOn: ukDate,
    contactName: optionalText(200),
    contactEmail: optionalEmail,
    contactPhone: optionalText(50),
    agencyName: optionalText(200),
    cvVersion: optionalText(100),
    coverLetterVersion: optionalText(100),
    notes: optionalText(10_000),
  })
  .transform((v, ctx) => {
    // A "/day" or "p.a." typed into either salary box overrides the period picker.
    const detected = v.salaryMin?.period ?? v.salaryMax?.period ?? null;
    const salaryPeriod = detected ?? v.salaryPeriod;
    const salaryMinPence = v.salaryMin?.pence ?? null;
    const salaryMaxPence = v.salaryMax?.pence ?? null;

    if (salaryMinPence != null && salaryMaxPence != null && salaryMaxPence < salaryMinPence) {
      ctx.addIssue({
        code: "custom",
        path: ["salaryMax"],
        message: "The maximum can't be lower than the minimum.",
      });
    }
    if (v.source === "OTHER" && !v.sourceOther) {
      ctx.addIssue({ code: "custom", path: ["sourceOther"], message: "Say where you found it." });
    }
    if ((v.contactEmail || v.contactPhone || v.agencyName) && !v.contactName) {
      ctx.addIssue({
        code: "custom",
        path: ["contactName"],
        message: "Add the contact's name to save their details.",
      });
    }

    return {
      companyName: v.companyName,
      roleTitle: v.roleTitle,
      status: v.status,
      jobUrl: v.jobUrl,
      source: v.source,
      sourceOther: v.source === "OTHER" ? v.sourceOther : null,
      locationType: v.locationType,
      // A fully remote role has no office city.
      city: v.locationType === "REMOTE" ? null : v.city,
      salaryMinPence,
      salaryMaxPence,
      salaryPeriod,
      contractType: v.contractType,
      // IR35 only applies to contracts.
      ir35Status: v.contractType === "CONTRACT" ? v.ir35Status : null,
      visaSponsorshipRequired: v.visaSponsorshipRequired,
      closingDate: v.closingDate,
      appliedOn: v.appliedOn,
      contact: v.contactName
        ? {
            name: v.contactName,
            email: v.contactEmail,
            phone: v.contactPhone,
            agencyName: v.agencyName,
          }
        : null,
      cvVersion: v.cvVersion,
      coverLetterVersion: v.coverLetterVersion,
      notes: v.notes,
    };
  });

export type ApplicationInput = z.output<typeof applicationSchema>;

/** Pulls the form's fields out of FormData as plain strings (missing → ""). */
export function formDataToValues(formData: FormData): ApplicationFormValues {
  const values: ApplicationFormValues = {};
  for (const field of APPLICATION_FIELDS) {
    const raw = formData.get(field);
    if (typeof raw === "string") values[field] = raw;
  }
  return values;
}

export type ParseResult =
  | { ok: true; data: ApplicationInput }
  | { ok: false; errors: Partial<Record<ApplicationField, string>> };

export function parseApplicationValues(values: ApplicationFormValues): ParseResult {
  const withDefaults = Object.fromEntries(
    APPLICATION_FIELDS.map((f) => [f, values[f] ?? ""]),
  ) as Record<ApplicationField, string>;
  // Empty enum strings should fall back to their defaults, not fail validation.
  const input = {
    ...withDefaults,
    status: withDefaults.status || undefined,
    salaryPeriod: withDefaults.salaryPeriod || undefined,
    visaSponsorshipRequired: withDefaults.visaSponsorshipRequired || undefined,
  };

  const result = applicationSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  return { ok: false, errors: fieldErrors<ApplicationField>(result.error) };
}

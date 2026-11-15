import type { ApplicationDetail } from "@/server/queries/applications";
import type { ApplicationFormValues } from "@/lib/validation/application";
import { formatCalendarDate } from "@/lib/format";
import { penceToInput } from "@/lib/salary";

/** Saved application → the strings the edit form starts with. */
export function applicationToFormValues(app: ApplicationDetail): ApplicationFormValues {
  return {
    companyName: app.company.name,
    roleTitle: app.roleTitle,
    status: app.status,
    jobUrl: app.jobUrl ?? "",
    source: app.source ?? "",
    sourceOther: app.sourceOther ?? "",
    locationType: app.locationType ?? "",
    city: app.city ?? "",
    salaryMin: penceToInput(app.salaryMinPence),
    salaryMax: penceToInput(app.salaryMaxPence),
    salaryPeriod: app.salaryPeriod,
    contractType: app.contractType ?? "",
    ir35Status: app.ir35Status ?? "",
    visaSponsorshipRequired: app.visaSponsorshipRequired ? "on" : "",
    closingDate: app.closingDate ? formatCalendarDate(app.closingDate) : "",
    appliedOn: app.appliedOn ? formatCalendarDate(app.appliedOn) : "",
    contactName: app.contact?.name ?? "",
    contactEmail: app.contact?.email ?? "",
    contactPhone: app.contact?.phone ?? "",
    agencyName: app.contact?.agencyName ?? "",
    cvVersion: app.cvVersion?.label ?? "",
    coverLetterVersion: app.coverLetterVersion?.label ?? "",
    notes: app.notes ?? "",
  };
}

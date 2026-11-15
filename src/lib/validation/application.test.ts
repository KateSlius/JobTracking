import { describe, expect, it } from "vitest";
import { parseApplicationValues, type ApplicationFormValues } from "./application";

const base: ApplicationFormValues = { companyName: "Monzo", roleTitle: "Backend Engineer" };

function parse(extra: ApplicationFormValues) {
  return parseApplicationValues({ ...base, ...extra });
}

describe("parseApplicationValues", () => {
  it("accepts the minimum: company and role", () => {
    const r = parse({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      companyName: "Monzo",
      roleTitle: "Backend Engineer",
      status: "SAVED",
      salaryPeriod: "ANNUM",
      visaSponsorshipRequired: false,
      contact: null,
      jobUrl: null,
    });
  });

  it("requires company and role", () => {
    const r = parseApplicationValues({ companyName: "  ", roleTitle: "" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.companyName).toBe("Enter the company name.");
    expect(r.errors.roleTitle).toBe("Enter the job title.");
  });

  it("parses UK dates and rejects US-style ones", () => {
    const good = parse({ closingDate: "31/03/2026" });
    expect(good.ok && good.data.closingDate?.toISOString()).toBe("2026-03-31T00:00:00.000Z");

    const bad = parse({ closingDate: "03/31/2026" });
    expect(!bad.ok && bad.errors.closingDate).toMatch(/DD\/MM\/YYYY/);
  });

  it("parses salaries and takes the period from a typed suffix", () => {
    const r = parse({ salaryMin: "£450", salaryMax: "£550/day", salaryPeriod: "ANNUM" });
    expect(r.ok && r.data).toMatchObject({
      salaryMinPence: 45_000,
      salaryMaxPence: 55_000,
      salaryPeriod: "DAY",
    });
  });

  it("rejects max below min", () => {
    const r = parse({ salaryMin: "55k", salaryMax: "45k" });
    expect(!r.ok && r.errors.salaryMax).toMatch(/can't be lower/);
  });

  it("rejects salary text that is not an amount", () => {
    const r = parse({ salaryMin: "competitive" });
    expect(!r.ok && r.errors.salaryMin).toBeTruthy();
  });

  it("drops IR35 unless the role is a contract", () => {
    const perm = parse({ contractType: "PERMANENT", ir35Status: "OUTSIDE" });
    expect(perm.ok && perm.data.ir35Status).toBeNull();

    const contract = parse({ contractType: "CONTRACT", ir35Status: "OUTSIDE" });
    expect(contract.ok && contract.data.ir35Status).toBe("OUTSIDE");
  });

  it("drops the city for fully remote roles", () => {
    const r = parse({ locationType: "REMOTE", city: "Leeds" });
    expect(r.ok && r.data.city).toBeNull();
  });

  it("needs a description when the source is Other", () => {
    const r = parse({ source: "OTHER" });
    expect(!r.ok && r.errors.sourceOther).toBeTruthy();
    const ok = parse({ source: "OTHER", sourceOther: "Meetup" });
    expect(ok.ok && ok.data.sourceOther).toBe("Meetup");
  });

  it("clears sourceOther when another source is picked", () => {
    const r = parse({ source: "REED", sourceOther: "leftover" });
    expect(r.ok && r.data.sourceOther).toBeNull();
  });

  it("adds https:// to bare job URLs and rejects junk", () => {
    const r = parse({ jobUrl: "www.reed.co.uk/jobs/123" });
    expect(r.ok && r.data.jobUrl).toBe("https://www.reed.co.uk/jobs/123");
    const bad = parse({ jobUrl: "not a url" });
    expect(!bad.ok && bad.errors.jobUrl).toBeTruthy();
  });

  it("builds a contact only when a name is given", () => {
    const r = parse({ contactName: "Priya", contactEmail: "Priya@Agency.co.uk" });
    expect(r.ok && r.data.contact).toEqual({
      name: "Priya",
      email: "priya@agency.co.uk",
      phone: null,
      agencyName: null,
    });

    const orphan = parse({ contactEmail: "priya@agency.co.uk" });
    expect(!orphan.ok && orphan.errors.contactName).toBeTruthy();
  });

  it("reads the visa checkbox", () => {
    const r = parse({ visaSponsorshipRequired: "on" });
    expect(r.ok && r.data.visaSponsorshipRequired).toBe(true);
  });

  it("rejects unknown enum values", () => {
    const r = parse({ status: "HIRED" });
    expect(!r.ok && r.errors.status).toBeTruthy();
  });
});

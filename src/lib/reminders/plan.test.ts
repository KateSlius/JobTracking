import { describe, expect, it } from "vitest";
import { planAutoReminders, reminderKey, type PlannerApplication } from "./plan";

const now = new Date("2026-11-15T12:00:00Z"); // Sun 15 Nov 2026, GMT
const date = (iso: string) => new Date(`${iso}T00:00:00Z`);

const base: PlannerApplication = {
  status: "SAVED",
  roleTitle: "Platform Engineer",
  companyName: "Octopus Energy",
  closingDate: null,
  appliedOn: null,
  interviews: [],
};
const plan = (extra: Partial<PlannerApplication>) => planAutoReminders({ ...base, ...extra }, now);

describe("closing date reminder", () => {
  it("is 09:00 London three days before the closing date", () => {
    const [r] = plan({ closingDate: date("2026-11-27") });
    expect(r.kind).toBe("CLOSING_DATE");
    expect(r.plannedAt.toISOString()).toBe("2026-11-24T09:00:00.000Z");
    expect(r.title).toBe("Apply before 27/11/2026: Platform Engineer at Octopus Energy");
  });

  it("uses BST in summer, so 09:00 London is 08:00 UTC", () => {
    const [r] = planAutoReminders({ ...base, closingDate: date("2027-07-10") }, now);
    expect(r.plannedAt.toISOString()).toBe("2027-07-07T08:00:00.000Z");
  });

  it("still exists (overdue) when the closing date is under three days away", () => {
    const [r] = plan({ closingDate: date("2026-11-16") });
    expect(r.plannedAt.toISOString()).toBe("2026-11-13T09:00:00.000Z");
  });

  it("goes once the closing date has passed or you've applied", () => {
    expect(plan({ closingDate: date("2026-11-14") })).toEqual([]);
    expect(
      plan({ closingDate: date("2026-11-27"), status: "APPLIED" }).map((r) => r.kind),
    ).not.toContain("CLOSING_DATE");
  });

  it("includes today's closing date", () => {
    expect(plan({ closingDate: date("2026-11-15") })).toHaveLength(1);
  });
});

describe("follow-up reminder", () => {
  it("is 09:00 London seven days after applying, while still at Applied", () => {
    const [r] = plan({ status: "APPLIED", appliedOn: date("2026-11-06") });
    expect(r.kind).toBe("FOLLOW_UP");
    expect(r.plannedAt.toISOString()).toBe("2026-11-13T09:00:00.000Z");
    expect(r.title).toBe("Follow up: Platform Engineer at Octopus Energy");
  });

  it("goes once you hear back", () => {
    expect(plan({ status: "ASSESSMENT", appliedOn: date("2026-11-06") })).toEqual([]);
  });

  it("needs an applied date", () => {
    expect(plan({ status: "APPLIED" })).toEqual([]);
  });
});

describe("interview prep reminder", () => {
  it("is 09:00 London the day before, one per upcoming interview", () => {
    const reminders = plan({
      status: "INTERVIEW",
      interviews: [
        { id: "a", startsAt: new Date("2026-11-18T10:00:00Z") },
        { id: "b", startsAt: new Date("2026-11-25T14:30:00Z") },
      ],
    });
    expect(reminders.map((r) => [r.interviewId, r.plannedAt.toISOString()])).toEqual([
      ["a", "2026-11-17T09:00:00.000Z"],
      ["b", "2026-11-24T09:00:00.000Z"],
    ]);
    expect(reminders[0].title).toBe(
      "Prepare for interview (Wed 18 Nov, 10:00): Platform Engineer at Octopus Energy",
    );
  });

  it("uses the London date for a late-evening interview in BST", () => {
    // 23:30 UTC on 1 Jul = 00:30 BST on 2 Jul → prep on 1 Jul at 09:00 BST
    const [r] = planAutoReminders(
      {
        ...base,
        status: "INTERVIEW",
        interviews: [{ id: "x", startsAt: new Date("2027-07-01T23:30:00Z") }],
      },
      now,
    );
    expect(r.plannedAt.toISOString()).toBe("2027-07-01T08:00:00.000Z");
  });

  it("skips interviews that have already started", () => {
    expect(
      plan({ interviews: [{ id: "old", startsAt: new Date("2026-11-10T10:00:00Z") }] }),
    ).toEqual([]);
  });
});

describe("finished applications", () => {
  it.each(["REJECTED", "WITHDRAWN"] as const)("plan nothing when %s", (status) => {
    expect(
      plan({
        status,
        closingDate: date("2026-11-27"),
        appliedOn: date("2026-11-06"),
        interviews: [{ id: "a", startsAt: new Date("2026-11-18T10:00:00Z") }],
      }),
    ).toEqual([]);
  });
});

describe("reminderKey", () => {
  it("separates prep reminders per interview", () => {
    expect(reminderKey({ kind: "INTERVIEW_PREP", interviewId: "a" })).not.toBe(
      reminderKey({ kind: "INTERVIEW_PREP", interviewId: "b" }),
    );
    expect(reminderKey({ kind: "FOLLOW_UP", interviewId: null })).toBe("FOLLOW_UP:");
  });
});

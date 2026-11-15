import { describe, expect, it } from "vitest";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import {
  appliedPerWeek,
  appliedThisPeriod,
  countByStatus,
  funnel,
  londonMonthStartDate,
  londonWeekStartDate,
  responseRate,
  type MetricsApplication,
} from "./metrics";

function app(path: ApplicationStatus[], appliedOn: string | null = null): MetricsApplication {
  return {
    status: path[path.length - 1],
    history: path,
    appliedOn: appliedOn ? new Date(`${appliedOn}T00:00:00Z`) : null,
  };
}

describe("responseRate", () => {
  it("is null when nothing has been applied for", () => {
    expect(responseRate([app(["SAVED"])])).toEqual({ applied: 0, responded: 0, rate: null });
  });

  it("counts rejections and progress as responses, not silence or withdrawal", () => {
    const apps = [
      app(["SAVED"]), // not applied
      app(["APPLIED"]), // silence
      app(["APPLIED", "REJECTED"]), // response
      app(["APPLIED", "INTERVIEW"]), // response
      app(["APPLIED", "WITHDRAWN"]), // no response
      app(["SAVED", "WITHDRAWN"]), // never applied
    ];
    expect(responseRate(apps)).toEqual({ applied: 4, responded: 2, rate: 0.5 });
  });

  it("counts an application added straight as Rejected", () => {
    expect(responseRate([app(["REJECTED"])])).toMatchObject({ applied: 1, responded: 1 });
  });

  it("keeps the response after withdrawing later", () => {
    expect(responseRate([app(["APPLIED", "INTERVIEW", "WITHDRAWN"])]).rate).toBe(1);
  });
});

describe("funnel", () => {
  it("counts each stage reached or passed, so it never widens", () => {
    const apps = [
      app(["APPLIED"]),
      app(["APPLIED", "REJECTED"]),
      app(["APPLIED", "ASSESSMENT", "REJECTED"]),
      app(["APPLIED", "INTERVIEW"]), // skipped assessment
      app(["APPLIED", "ASSESSMENT", "INTERVIEW", "OFFER"]),
      app(["SAVED"]),
    ];
    expect(funnel(apps)).toEqual([
      { stage: "APPLIED", count: 5 },
      { stage: "ASSESSMENT", count: 3 },
      { stage: "INTERVIEW", count: 2 },
      { stage: "OFFER", count: 1 },
    ]);
  });

  it("returns zeros for no data", () => {
    expect(funnel([]).every((s) => s.count === 0)).toBe(true);
  });
});

describe("countByStatus", () => {
  it("counts current statuses, including zeros", () => {
    const counts = countByStatus([app(["SAVED"]), app(["APPLIED", "OFFER"]), app(["SAVED"])]);
    expect(counts).toMatchObject({ SAVED: 2, OFFER: 1, APPLIED: 0, WITHDRAWN: 0 });
  });
});

describe("London week and month starts", () => {
  it("finds Monday for a Sunday", () => {
    // Sun 15 Nov 2026 → Mon 9 Nov
    expect(londonWeekStartDate(new Date("2026-11-15T12:00:00Z")).toISOString()).toBe(
      "2026-11-09T00:00:00.000Z",
    );
  });

  it("uses the London date late on Sunday night in BST", () => {
    // 23:30 UTC Sun 5 Jul = 00:30 BST Mon 6 Jul → new week
    expect(londonWeekStartDate(new Date("2026-07-05T23:30:00Z")).toISOString()).toBe(
      "2026-07-06T00:00:00.000Z",
    );
  });

  it("rolls the month at London midnight", () => {
    // 23:30 UTC 31 Jul = 00:30 BST 1 Aug
    expect(londonMonthStartDate(new Date("2026-07-31T23:30:00Z")).toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });
});

describe("appliedThisPeriod", () => {
  const now = new Date("2026-11-15T12:00:00Z"); // Sunday; week starts Mon 9 Nov
  it("splits this week, last week and this month", () => {
    const apps = [
      app(["APPLIED"], "2026-11-09"), // this week (Monday)
      app(["APPLIED"], "2026-11-15"), // this week (today)
      app(["APPLIED"], "2026-11-08"), // last week (Sunday)
      app(["APPLIED"], "2026-11-02"), // last week (Monday)
      app(["APPLIED"], "2026-11-01"), // earlier, still this month
      app(["APPLIED"], "2026-10-31"), // last month
      app(["SAVED"]),
    ];
    expect(appliedThisPeriod(apps, now)).toEqual({ thisWeek: 2, previousWeek: 2, thisMonth: 5 });
  });
});

describe("appliedPerWeek", () => {
  it("buckets by Monday-start week, oldest first", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    const weeks = appliedPerWeek(
      [
        app(["APPLIED"], "2026-11-10"),
        app(["APPLIED"], "2026-11-11"),
        app(["APPLIED"], "2026-11-02"),
        app(["APPLIED"], "2026-09-01"), // older than 3 weeks: ignored
      ],
      now,
      3,
    );
    expect(weeks.map((w) => [w.weekStart.toISOString().slice(0, 10), w.count])).toEqual([
      ["2026-10-26", 0],
      ["2026-11-02", 1],
      ["2026-11-09", 2],
    ]);
  });
});

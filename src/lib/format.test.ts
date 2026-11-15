import { describe, expect, it } from "vitest";
import {
  formatCalendarDate,
  formatDate,
  formatDateTime,
  formatGBP,
  formatSalary,
  formatTime,
  londonWallTimeToUtc,
  parseUkDate,
  startOfLondonMonth,
  startOfLondonWeek,
} from "./format";

// 2026 clock changes: BST starts Sun 29 March 01:00 UTC, ends Sun 25 October 01:00 UTC.

describe("instant formatting (Europe/London)", () => {
  it("formats GMT (winter) times unchanged from UTC", () => {
    const d = new Date("2026-01-15T09:30:00Z");
    expect(formatDate(d)).toBe("15/01/2026");
    expect(formatTime(d)).toBe("09:30");
    expect(formatDateTime(d)).toBe("15/01/2026, 09:30");
  });

  it("adds an hour during BST", () => {
    expect(formatDateTime("2026-07-01T08:30:00Z")).toBe("01/07/2026, 09:30");
  });

  it("rolls over to the next London day late in the evening during BST", () => {
    expect(formatDate("2026-06-30T23:30:00Z")).toBe("01/07/2026");
  });

  it("handles the spring-forward boundary", () => {
    expect(formatTime("2026-03-29T00:59:00Z")).toBe("00:59"); // GMT
    expect(formatTime("2026-03-29T01:00:00Z")).toBe("02:00"); // BST
  });

  it("handles the autumn-back boundary", () => {
    expect(formatTime("2026-10-25T00:30:00Z")).toBe("01:30"); // BST
    expect(formatTime("2026-10-25T01:30:00Z")).toBe("01:30"); // GMT
  });
});

describe("calendar dates", () => {
  it("formats a Postgres date without shifting the day", () => {
    expect(formatCalendarDate(new Date("2026-07-01T00:00:00Z"))).toBe("01/07/2026");
  });

  it("parses DD/MM/YYYY to midnight UTC", () => {
    expect(parseUkDate("31/03/2026")?.toISOString()).toBe("2026-03-31T00:00:00.000Z");
    expect(parseUkDate(" 1/7/2026 ")?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("rejects invalid or US-style dates", () => {
    expect(parseUkDate("31/02/2026")).toBeNull();
    expect(parseUkDate("12/31/2026")).toBeNull();
    expect(parseUkDate("2026-03-31")).toBeNull();
    expect(parseUkDate("")).toBeNull();
  });
});

describe("londonWallTimeToUtc", () => {
  it("converts winter times 1:1", () => {
    expect(londonWallTimeToUtc("2026-01-15", "09:30").toISOString()).toBe(
      "2026-01-15T09:30:00.000Z",
    );
  });

  it("subtracts an hour in summer", () => {
    expect(londonWallTimeToUtc("2026-07-01", "09:30").toISOString()).toBe(
      "2026-07-01T08:30:00.000Z",
    );
  });

  it("works on the day the clocks change", () => {
    expect(londonWallTimeToUtc("2026-03-29", "09:00").toISOString()).toBe(
      "2026-03-29T08:00:00.000Z",
    );
    expect(londonWallTimeToUtc("2026-10-25", "09:00").toISOString()).toBe(
      "2026-10-25T09:00:00.000Z",
    );
  });
});

describe("week and month boundaries", () => {
  it("starts the week on Monday 00:00 London time", () => {
    // Sunday 15 Nov 2026 (GMT) → Monday 9 Nov 00:00 GMT
    expect(startOfLondonWeek("2026-11-15T12:00:00Z").toISOString()).toBe(
      "2026-11-09T00:00:00.000Z",
    );
  });

  it("uses BST midnight in summer", () => {
    // Wed 1 Jul 2026 → Mon 29 Jun 00:00 BST = 28 Jun 23:00 UTC
    expect(startOfLondonWeek("2026-07-01T12:00:00Z").toISOString()).toBe(
      "2026-06-28T23:00:00.000Z",
    );
  });

  it("counts a late Sunday-night BST time in the new week", () => {
    // Sun 5 Jul 23:30 UTC = Mon 6 Jul 00:30 BST → week starts Mon 6 Jul
    expect(startOfLondonWeek("2026-07-05T23:30:00Z").toISOString()).toBe(
      "2026-07-05T23:00:00.000Z",
    );
  });

  it("starts the month at London midnight", () => {
    expect(startOfLondonMonth("2026-07-15T12:00:00Z").toISOString()).toBe(
      "2026-06-30T23:00:00.000Z",
    );
    expect(startOfLondonMonth("2026-11-15T12:00:00Z").toISOString()).toBe(
      "2026-11-01T00:00:00.000Z",
    );
  });
});

describe("GBP", () => {
  it("formats whole pounds without pence", () => {
    expect(formatGBP(4_500_000)).toBe("£45,000");
  });

  it("shows pence when present", () => {
    expect(formatGBP(51_250)).toBe("£512.50");
  });

  it("formats salary ranges", () => {
    expect(formatSalary(4_500_000, 5_500_000, "ANNUM")).toBe("£45,000–£55,000 per annum");
    expect(formatSalary(50_000, 50_000, "DAY")).toBe("£500 per day");
    expect(formatSalary(4_500_000, null, "ANNUM")).toBe("From £45,000 per annum");
    expect(formatSalary(null, 6_000_000, "ANNUM")).toBe("Up to £60,000 per annum");
    expect(formatSalary(null, null, "ANNUM")).toBeNull();
  });
});

describe("test environment", () => {
  it("runs outside Europe/London so missing time zones get caught", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
  });
});

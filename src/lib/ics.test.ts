import { describe, expect, it } from "vitest";
import {
  buildIcs,
  escapeText,
  foldLine,
  googleCalendarUrl,
  icsFileName,
  outlookCalendarUrl,
  type CalendarEvent,
} from "./ics";

const summer: CalendarEvent = {
  uid: "abc-123",
  sequence: 2,
  start: new Date("2026-07-01T09:00:00Z"), // 10:00 BST
  end: new Date("2026-07-01T10:00:00Z"),
  title: "Interview: Senior Backend Engineer – Monzo",
  description: "2nd round, system design\nhttps://meet.example.com/x",
  location: "Broadgate, London; 3rd floor",
};

const winter: CalendarEvent = {
  ...summer,
  start: new Date("2026-11-18T10:00:00Z"), // 10:00 GMT
  end: new Date("2026-11-18T11:00:00Z"),
};

describe("buildIcs", () => {
  const ics = buildIcs(summer, new Date("2026-06-20T12:00:00Z"));
  const lines = ics.split("\r\n");

  it("uses CRLF line endings and ends with one", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("writes London wall time with a VTIMEZONE, not UTC", () => {
    expect(lines).toContain("DTSTART;TZID=Europe/London:20260701T100000");
    expect(lines).toContain("DTEND;TZID=Europe/London:20260701T110000");
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:Europe/London");
    expect(ics).toContain("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU");
  });

  it("keeps the same wall time in winter (GMT)", () => {
    expect(buildIcs(winter)).toContain("DTSTART;TZID=Europe/London:20261118T100000");
  });

  it("has a stable UID, a sequence and a UTC DTSTAMP", () => {
    expect(lines).toContain("UID:abc-123@uk-job-tracker");
    expect(lines).toContain("SEQUENCE:2");
    expect(lines).toContain("DTSTAMP:20260620T120000Z");
  });

  it("escapes text fields", () => {
    expect(lines).toContain("LOCATION:Broadgate\\, London\\; 3rd floor");
    expect(ics).toContain("DESCRIPTION:2nd round\\, system design\\nhttps://meet.example.com/x");
  });

  it("omits optional fields that are empty", () => {
    const bare = buildIcs({ ...summer, location: null, description: undefined, url: null });
    expect(bare).not.toMatch(/^LOCATION:/m);
    expect(bare).not.toMatch(/^URL:/m);
    expect(bare).not.toMatch(/^DESCRIPTION:2nd/m);
  });

  it("keeps every physical line within 75 octets", () => {
    const long = buildIcs({ ...summer, description: "Très long ".repeat(40) });
    for (const line of long.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe("escapeText and foldLine", () => {
  it("escapes backslashes first", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("folds without splitting multi-byte characters and unfolds to the original", () => {
    const line = `DESCRIPTION:${"£€é".repeat(40)}`;
    const folded = foldLine(line);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
    expect(folded).not.toContain("�");
  });

  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Hi")).toBe("SUMMARY:Hi");
  });
});

describe("calendar links", () => {
  it("builds a Google link with UTC times and the London zone", () => {
    const url = new URL(googleCalendarUrl(summer));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20260701T090000Z/20260701T100000Z");
    expect(url.searchParams.get("ctz")).toBe("Europe/London");
    expect(url.searchParams.get("text")).toBe(summer.title);
    expect(url.searchParams.get("location")).toBe(summer.location);
  });

  it("builds Outlook links for personal and work accounts", () => {
    const personal = new URL(outlookCalendarUrl(summer, "personal"));
    const work = new URL(outlookCalendarUrl(summer, "work"));
    expect(personal.hostname).toBe("outlook.live.com");
    expect(work.hostname).toBe("outlook.office.com");
    expect(personal.searchParams.get("startdt")).toBe("2026-07-01T09:00:00.000Z");
    expect(personal.searchParams.get("subject")).toBe(summer.title);
  });
});

describe("icsFileName", () => {
  it("slugs the company and uses the London date", () => {
    expect(icsFileName("Sainsbury's Tech", new Date("2026-07-01T23:30:00Z"))).toBe(
      "interview-sainsbury-s-tech-2026-07-02.ics",
    );
  });
});

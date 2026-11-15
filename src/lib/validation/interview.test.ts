import { describe, expect, it } from "vitest";
import { parseInterviewValues, type InterviewFormValues } from "./interview";

const base: InterviewFormValues = { type: "VIDEO", date: "18/11/2026", startTime: "10:00" };
const parse = (extra: InterviewFormValues) => parseInterviewValues({ ...base, ...extra });

describe("parseInterviewValues", () => {
  it("defaults to one hour when no end time is given", () => {
    const r = parse({});
    expect(r.ok && r.data.startsAt.toISOString()).toBe("2026-11-18T10:00:00.000Z");
    expect(r.ok && r.data.endsAt.toISOString()).toBe("2026-11-18T11:00:00.000Z");
  });

  it("treats times as London time, so BST shifts the UTC instant", () => {
    const r = parse({ date: "01/07/2026", startTime: "2:30pm", endTime: "15.15" });
    expect(r.ok && r.data.startsAt.toISOString()).toBe("2026-07-01T13:30:00.000Z");
    expect(r.ok && r.data.endsAt.toISOString()).toBe("2026-07-01T14:15:00.000Z");
  });

  it("requires type, date and start time", () => {
    const r = parseInterviewValues({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.type).toBe("Choose the type of interview.");
    expect(r.errors.startTime).toMatch(/start time/);
  });

  it("asks for a date when it's missing", () => {
    const r = parse({ date: "" });
    expect(!r.ok && r.errors.date).toBe("Enter the interview date.");
  });

  it("rejects US-style dates and unreadable times", () => {
    expect(!parse({ date: "11/18/2026" }).ok).toBe(true);
    const r = parse({ startTime: "half ten" });
    expect(!r.ok && r.errors.startTime).toMatch(/14:30/);
  });

  it("rejects an end time before the start", () => {
    const r = parse({ startTime: "14:00", endTime: "13:00" });
    expect(!r.ok && r.errors.endTime).toMatch(/after the start/);
  });

  it("keeps a meeting link only for video, and an address only in person", () => {
    const video = parse({ meetingUrl: "teams.microsoft.com/l/meetup", location: "Leeds" });
    expect(video.ok && video.data.meetingUrl).toBe("https://teams.microsoft.com/l/meetup");
    expect(video.ok && video.data.location).toBeNull();

    const office = parse({
      type: "IN_PERSON",
      meetingUrl: "zoom.us/j/1",
      location: "1 King St, Leeds",
    });
    expect(office.ok && office.data.location).toBe("1 King St, Leeds");
    expect(office.ok && office.data.meetingUrl).toBeNull();

    const centre = parse({ type: "ASSESSMENT_CENTRE", location: "Canary Wharf" });
    expect(centre.ok && centre.data.location).toBe("Canary Wharf");
  });

  it("rejects non-web meeting links", () => {
    const r = parse({ meetingUrl: "javascript:alert(1)" });
    expect(!r.ok && r.errors.meetingUrl).toBeTruthy();
  });
});

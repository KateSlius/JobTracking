import { describe, expect, it } from "vitest";
import { buildReminderDigest, escapeHtml } from "./reminder-digest";

const reminders = [
  {
    title: "Follow up: Full Stack Engineer at Skyscanner",
    dueAt: new Date("2026-11-13T09:00:00Z"),
    applicationId: "app1",
  },
  {
    title: "Prepare for interview: <Staff> & Co",
    dueAt: new Date("2026-07-01T08:00:00Z"),
    applicationId: null,
  },
];

describe("buildReminderDigest", () => {
  const email = buildReminderDigest({
    name: "Priya Shah",
    reminders,
    appUrl: "https://jobs.example.com/",
  });

  it("summarises the count in the subject", () => {
    expect(email.subject).toBe(
      "2 reminders: Follow up: Full Stack Engineer at Skyscanner and 1 more",
    );
    expect(
      buildReminderDigest({ name: null, reminders: [reminders[0]], appUrl: "https://x.test" })
        .subject,
    ).toBe("Reminder: Follow up: Full Stack Engineer at Skyscanner");
  });

  it("greets by first name, or plainly without one", () => {
    expect(email.text.startsWith("Hi Priya,")).toBe(true);
    expect(
      buildReminderDigest({ name: null, reminders, appUrl: "https://x.test" }).text.startsWith(
        "Hi,",
      ),
    ).toBe(true);
  });

  it("shows due times in London time (BST in summer)", () => {
    expect(email.text).toContain("Due Fri 13 Nov, 09:00");
    expect(email.text).toContain("Due Wed 1 Jul, 09:00");
  });

  it("links each reminder to its application, or to the reminders page", () => {
    expect(email.text).toContain("https://jobs.example.com/applications/app1");
    expect(email.html).toContain('href="https://jobs.example.com/applications/app1"');
    expect(email.html).toContain('href="https://jobs.example.com/reminders"');
  });

  it("escapes titles in the HTML", () => {
    expect(email.html).toContain("Prepare for interview: &lt;Staff&gt; &amp; Co");
    expect(email.html).not.toContain("<Staff>");
  });

  it("explains why it was sent and how to stop", () => {
    expect(email.text).toContain("To turn them off");
    expect(email.html).toContain("Turn them off");
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML-sensitive characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});

import { describe, expect, it } from "vitest";
import { buildAccountDeletedEmail } from "./account-deleted";

describe("buildAccountDeletedEmail", () => {
  it("states what was deleted and when, in UK time", () => {
    const email = buildAccountDeletedEmail({
      name: "Priya Shah",
      when: new Date("2026-07-01T09:00:00Z"),
    });
    expect(email.subject).toBe("Your Job Tracker account has been deleted");
    expect(email.text).toContain("Hi Priya,");
    expect(email.text).toContain("1 July 2026 at 10:00");
    expect(email.html).toContain('lang="en-GB"');
  });

  it("escapes the name", () => {
    expect(buildAccountDeletedEmail({ name: "<b>", when: new Date() }).html).toContain(
      "Hi &lt;b&gt;,",
    );
  });
});

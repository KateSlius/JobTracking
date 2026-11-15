import { describe, expect, it } from "vitest";
import { parseReminderForm } from "./reminder";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return parseReminderForm(fd);
}

describe("parseReminderForm", () => {
  it("defaults to 09:00 London time", () => {
    const r = form({ title: "Chase recruiter", date: "20/11/2026" });
    expect(r.ok && r.data.dueAt.toISOString()).toBe("2026-11-20T09:00:00.000Z");
  });

  it("uses BST in summer", () => {
    const r = form({ title: "Chase", date: "01/07/2027", time: "2pm" });
    expect(r.ok && r.data.dueAt.toISOString()).toBe("2027-07-01T13:00:00.000Z");
  });

  it("keeps the optional application link", () => {
    expect(form({ title: "x", date: "20/11/2026", applicationId: "app1" })).toMatchObject({
      ok: true,
      data: { applicationId: "app1" },
    });
    expect(form({ title: "x", date: "20/11/2026" })).toMatchObject({
      data: { applicationId: null },
    });
  });

  it("requires a title and a UK date, and a readable time", () => {
    const r = form({ title: " ", date: "11/20/2026", time: "soon" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.title).toBeTruthy();
    expect(r.errors.date).toMatch(/DD\/MM\/YYYY/);
  });

  it("rejects an unreadable time", () => {
    const r = form({ title: "x", date: "20/11/2026", time: "soon" });
    expect(!r.ok && r.errors.time).toMatch(/09:00/);
  });
});

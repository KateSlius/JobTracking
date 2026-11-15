import { expect, londonDate, londonDay, reseed, test } from "./support";

const interviewsCard = (page: import("@playwright/test").Page) =>
  page.locator("[data-slot=card]", { has: page.getByText("Interviews", { exact: true }) });

async function appId(db: { query: <T>(sql: string, p?: unknown[]) => Promise<T[]> }, role: string) {
  const [row] = await db.query<{ id: string }>(
    `select a.id from "Application" a join "User" u on u.id = a."userId"
     where u.email = 'demo@example.com' and a."roleTitle" = $1`,
    [role],
  );
  return row.id;
}

test.describe("interviews and calendar", () => {
  // A viewer in New York must still see UK times.
  test.use({ timezoneId: "America/New_York", locale: "en-US" });
  test.beforeAll(() => reseed());
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test("seeded interview shows at 10:00 UK time with calendar links", async ({ page, db }) => {
    await page.goto(`/applications/${await appId(db, "Senior Backend Engineer")}`);
    await expect(interviewsCard(page)).toContainText(`${londonDay(3)}, 10:00–11:00`);

    await interviewsCard(page).getByRole("button", { name: "Add to calendar" }).click();
    const google = new URL(
      (await page.getByRole("menuitem", { name: "Google Calendar" }).getAttribute("href"))!,
    );
    expect(google.searchParams.get("ctz")).toBe("Europe/London");
    expect(google.searchParams.get("text")).toBe("Interview: Senior Backend Engineer – Monzo");
    await expect(page.getByRole("menuitem", { name: "Outlook (work or school)" })).toHaveAttribute(
      "href",
      /^https:\/\/outlook\.office\.com\//,
    );
  });

  test(".ics download: London time, stable UID, no private notes", async ({ page, db }) => {
    const [interview] = await db.query<{ id: string; icsUid: string }>(
      `select i.id, i."icsUid" from "Interview" i where i."applicationId" = $1`,
      [await appId(db, "Senior Backend Engineer")],
    );
    const res = await page.request.get(`/api/interviews/${interview.id}/ics`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^text\/calendar/);
    expect(res.headers()["content-disposition"]).toMatch(/attachment; filename="interview-monzo-/);
    const ics = await res.text();
    expect(ics).toMatch(/DTSTART;TZID=Europe\/London:\d{8}T100000/);
    expect(ics).toContain("TZID:Europe/London");
    expect(ics).toContain(`UID:${interview.icsUid}@uk-job-tracker`);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(ics.toLowerCase()).not.toContain("prep");
  });

  test("add, edit and delete an interview", async ({ page, db }) => {
    const id = await appId(db, "Full Stack Engineer");
    await page.goto(`/applications/${id}`);
    await interviewsCard(page).getByRole("button", { name: "Add interview" }).click();
    await page.getByLabel("Type").selectOption("IN_PERSON");
    await expect(page.getByLabel("Meeting link")).toHaveCount(0);
    await page.getByLabel("Stage").fill("Final round");
    await page.getByLabel("Date", { exact: true }).fill(londonDate(10));
    await page.getByLabel("Start").fill("2:30pm");
    await page.getByLabel("End").fill("13:00");
    await page.getByLabel("Address").fill("Quartermile One, Edinburgh");
    await page.getByRole("button", { name: "Add interview" }).click();
    await expect(page.getByText("The end time must be after the start time.")).toBeVisible();
    await expect(page.getByLabel("Type")).toHaveValue("IN_PERSON");

    await page.getByLabel("End").fill("");
    await page.getByRole("button", { name: "Add interview" }).click();
    await expect(interviewsCard(page)).toContainText(`${londonDay(10)}, 14:30–15:30`);
    await expect(interviewsCard(page)).toContainText("In person · Final round");

    await interviewsCard(page)
      .getByRole("button", { name: /^Edit In person interview/ })
      .click();
    await page.getByLabel("Start").fill("15:00");
    await page.getByLabel("End").fill("16:30");
    await page.getByRole("button", { name: "Save interview" }).click();
    await expect(interviewsCard(page)).toContainText("15:00–16:30");
    const [{ icsSequence }] = await db.query<{ icsSequence: number }>(
      `select "icsSequence" from "Interview" where "applicationId" = $1`,
      [id],
    );
    expect(icsSequence).toBe(1);

    page.once("dialog", (d) => d.accept());
    await interviewsCard(page)
      .getByRole("button", { name: /^Delete In person interview/ })
      .click();
    await expect(interviewsCard(page)).toContainText("No interviews scheduled.");
  });

  test("calendar shows UK times, Monday-first weeks and amber closing dates", async ({ page }) => {
    await page.goto("/calendar");
    const cal = page.locator(".jt-calendar");
    const monzo = cal.locator("a", { hasText: "Monzo · Senior Backend Engineer" }).first();
    await expect(monzo).toContainText("10:00");
    await expect(cal.locator("[role=columnheader]").first()).toContainText("Mon");
    const closing = cal.locator("a", { hasText: "Closes: HMRC" }).first();
    await expect(closing).toBeVisible();
    expect(await closing.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
      "rgb(180, 83, 9)",
    );

    await page.getByRole("tab", { name: "Week view" }).click();
    await expect(cal).toContainText("13:00");
  });

  test("another user's interview can't be downloaded", async ({ page, db }) => {
    await db.query(
      `insert into "User" (id,email,"updatedAt") values ('e2e-other','other@example.com',now()) on conflict do nothing`,
    );
    await db.query(
      `insert into "Company" (id,"userId",name,"updatedAt") values ('e2e-co','e2e-other','Secret',now()) on conflict do nothing`,
    );
    await db.query(
      `insert into "Application" (id,"userId","companyId","roleTitle","updatedAt") values ('e2e-app','e2e-other','e2e-co','Secret',now()) on conflict do nothing`,
    );
    await db.query(
      `insert into "Interview" (id,"applicationId",type,"startsAt","endsAt","icsUid","updatedAt") values ('e2e-int','e2e-app','VIDEO',now(),now()+interval '1 hour','e2e-uid',now()) on conflict do nothing`,
    );
    expect((await page.request.get("/api/interviews/e2e-int/ics")).status()).toBe(404);
    await db.query(`delete from "User" where id = 'e2e-other'`);
  });
});

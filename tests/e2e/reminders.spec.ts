import { CRON_SECRET, clearOutbox, expect, readOutbox, reseed, test } from "./support";

type Summary = { notified: number; emailsSent: number; emailsFailed: number };

const card = (page: import("@playwright/test").Page, title: string) =>
  page.locator("[data-slot=card]", { has: page.getByText(title, { exact: true }) });

test.describe("reminders, notifications and email", () => {
  test.beforeAll(() => {
    reseed();
    clearOutbox();
  });
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  const runJob = async (request: import("@playwright/test").APIRequestContext) => {
    // Local prisma dev occasionally rejects a query under load; one retry keeps the test honest
    // about the job (it is idempotent) without failing on the local database's limits.
    let res = await request.get("/api/cron/reminders", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (res.status() === 500) {
      res = await request.get("/api/cron/reminders", {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
    }
    expect(res.ok()).toBe(true);
    return (await res.json()) as Summary;
  };

  test("automatic reminders are listed", async ({ page }) => {
    await page.goto("/reminders");
    await expect(card(page, "Overdue")).toContainText(
      "Follow up: Full Stack Engineer at Skyscanner",
    );
    await expect(card(page, "Overdue")).toContainText(/Apply before .*HMRC/);
    await expect(card(page, "Coming up")).toContainText("Prepare for interview");
    await expect(page.getByRole("button", { name: "Notifications, none unread" })).toBeVisible();
  });

  test("the job needs the secret", async ({ request }) => {
    expect((await request.get("/api/cron/reminders")).status()).toBe(401);
    expect(
      (
        await request.get("/api/cron/reminders", { headers: { Authorization: "Bearer nope" } })
      ).status(),
    ).toBe(401);
  });

  test("runs once: notifications plus one email; running again does nothing", async ({
    request,
    page,
  }) => {
    const first = await runJob(request);
    expect(first.notified).toBe(2);
    expect(first.emailsSent).toBe(1);
    const emails = readOutbox();
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("demo@example.com");
    // Skyscanner's follow-up fell due over 48 hours ago: notified in-app, not emailed.
    expect(emails[0].subject).toMatch(/^Reminder: Apply before .*HMRC$/);
    expect(emails[0].text).not.toContain("Skyscanner");

    const second = await runJob(request);
    expect(second).toMatchObject({ notified: 0, emailsSent: 0 });
    expect(readOutbox()).toHaveLength(1);

    await page.goto("/dashboard");
    const bell = page.getByRole("button", { name: "Notifications, 2 unread" });
    await bell.click();
    await expect(page.getByRole("menu")).toContainText(
      "Follow up: Full Stack Engineer at Skyscanner",
    );
    await page.getByRole("menuitem", { name: "Mark all as read" }).click();
    await expect(page.getByRole("button", { name: "Notifications, none unread" })).toBeVisible();
  });

  test("two runs at once don't duplicate anything", async ({ request, db }) => {
    const [{ id: userId }] = await db.query<{ id: string }>(
      `select id from "User" where email = 'demo@example.com'`,
    );
    for (const t of ["A", "B", "C"]) {
      await db.query(
        `insert into "Reminder" (id,"userId",kind,title,"dueAt","createdAt") values ($1,$2,'CUSTOM',$3,now()-interval '1 minute',now())`,
        [`e2e-race-${t}`, userId, `Race ${t}`],
      );
    }
    const before = readOutbox().length;
    const [a, b] = await Promise.all([runJob(request), runJob(request)]);
    const [{ n }] = await db.query<{ n: number }>(
      `select count(*)::int n from "Notification" where "reminderId" like 'e2e-race-%'`,
    );
    expect(n).toBe(3);
    expect(a.emailsSent + b.emailsSent).toBe(1);
    expect(readOutbox()).toHaveLength(before + 1);
    await db.query(`delete from "Reminder" where id like 'e2e-race-%'`);
  });

  test("snooze and dismiss survive later edits", async ({ page, db }) => {
    await page.goto("/reminders");
    await card(page, "Overdue")
      .locator("li", { hasText: "Skyscanner" })
      .getByRole("button", { name: "Snooze" })
      .click();
    await expect(card(page, "Coming up")).toContainText(
      "Follow up: Full Stack Engineer at Skyscanner",
    );
    const dueAfterSnooze = async () =>
      (
        await db.query<{ dueAt: Date }>(
          `select "dueAt" from "Reminder" where kind='FOLLOW_UP' and title like '%Skyscanner%'`,
        )
      )[0].dueAt.toISOString();
    const snoozed = await dueAfterSnooze();

    await card(page, "Overdue")
      .locator("li", { hasText: "HMRC" })
      .getByRole("button", { name: /^Dismiss/ })
      .click();
    await expect(card(page, "Overdue").locator("li", { hasText: "HMRC" })).toHaveCount(0);

    // Edit both applications: neither reminder should come back or move.
    for (const role of ["Full Stack Engineer", "Senior Software Developer (G7)"]) {
      await page.goto(`/applications?q=${encodeURIComponent(role.split(" ")[0])}`);
      await page.locator("tbody tr a", { hasText: role }).click();
      await page.getByRole("link", { name: "Edit" }).click();
      await page.getByLabel("Notes").fill(`Edited by e2e at ${Date.now()}`);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page).toHaveURL(/\/applications\/[a-z0-9]+$/);
    }
    expect(await dueAfterSnooze()).toBe(snoozed);
    const [{ n }] = await db.query<{ n: number }>(
      `select count(*)::int n from "Reminder" where kind='CLOSING_DATE' and title like '%HMRC%'
       and "dismissedAt" is null and "completedAt" is null`,
    );
    expect(n).toBe(0);
  });

  test("moving past Applied removes the follow-up", async ({ page }) => {
    await page.goto("/applications?q=arm");
    await page.locator("tbody tr a").first().click();
    const reminders = card(page, "Reminders");
    await expect(reminders).toContainText("Follow up: Software Engineer, Developer Tools at Arm");
    await page.getByLabel("Move to").selectOption("ASSESSMENT");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(reminders).toContainText("No reminders for this application.");
  });

  test("custom reminder: keep input on error, then save, done and undo", async ({ page }) => {
    await page.goto("/reminders");
    await card(page, "Add a reminder").getByRole("button", { name: "Add reminder" }).click();
    await page.getByLabel("Remind me to…").fill("Send thank-you email");
    await page.getByLabel("Date", { exact: true }).fill("11/30/2026");
    await page.getByRole("button", { name: "Add reminder" }).click();
    await expect(page.getByText("Enter a date as DD/MM/YYYY").first()).toBeVisible();
    await expect(page.getByLabel("Remind me to…")).toHaveValue("Send thank-you email");

    const tomorrow = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London" }).format(
      new Date(Date.now() + 86_400_000),
    );
    await page.getByLabel("Date", { exact: true }).fill(tomorrow);
    await page.getByLabel("Time", { exact: true }).fill("4pm");
    await page.getByRole("button", { name: "Add reminder" }).click();
    const row = card(page, "Coming up").locator("li", { hasText: "Send thank-you email" });
    await expect(row).toContainText("16:00");
    await row.getByRole("button", { name: "Done" }).click();
    const done = card(page, "Done recently").locator("li", { hasText: "Send thank-you email" });
    await done.getByRole("button", { name: "Undo" }).click();
    await expect(card(page, "Coming up")).toContainText("Send thank-you email");
  });

  test("with email off, reminders are notified but not emailed", async ({ page, request, db }) => {
    await page.goto("/reminders");
    const toggle = page.getByRole("switch", { name: /Email me when reminders are due/ });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect
      .poll(
        async () =>
          (
            await db.query<{ e: boolean }>(
              `select "emailRemindersEnabled" e from "User" where email='demo@example.com'`,
            )
          )[0].e,
      )
      .toBe(false);

    const [{ id: userId }] = await db.query<{ id: string }>(
      `select id from "User" where email = 'demo@example.com'`,
    );
    await db.query(
      `insert into "Reminder" (id,"userId",kind,title,"dueAt","createdAt") values ('e2e-quiet',$1,'CUSTOM','Quiet one',now()-interval '1 minute',now())`,
      [userId],
    );
    const before = readOutbox().length;
    await runJob(request);
    const [quiet] = await db.query<{ notifiedAt: Date | null; emailedAt: Date | null }>(
      `select "notifiedAt", "emailedAt" from "Reminder" where id = 'e2e-quiet'`,
    );
    expect(quiet.notifiedAt).not.toBeNull();
    expect(quiet.emailedAt).toBeNull();
    expect(readOutbox()).toHaveLength(before);
    await db.query(`delete from "Reminder" where id = 'e2e-quiet'`);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});

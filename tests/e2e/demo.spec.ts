import { CRON_SECRET, expect, test } from "./support";

test.describe("try the demo", () => {
  // Don't leave demo accounts behind for later specs.
  test.afterAll(async ({ db }) => {
    await db.query(`delete from "User" where email like '%@demo.invalid'`);
  });

  test("one click gives a private, pre-filled demo account", async ({ page, db }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try the demo" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("You're exploring a demo account.")).toBeVisible();
    const tile = page.locator("div.rounded-lg.border", {
      has: page.getByText("Response rate", { exact: true }),
    });
    await expect(tile).toContainText("67%");

    // Email can't be switched on for an address that can't receive it.
    await page.goto("/settings");
    await expect(
      page.getByRole("switch", { name: /Email me when reminders are due/ }),
    ).toBeDisabled();

    const [{ n }] = await db.query<{ n: number }>(
      `select count(*)::int n from "User" where "isDemo" and email like '%@demo.invalid'`,
    );
    expect(n).toBeGreaterThan(0);
  });

  test("each visitor gets their own copy", async ({ browser }) => {
    const first = await browser.newContext();
    const second = await browser.newContext();
    const a = await first.newPage();
    const b = await second.newPage();
    for (const p of [a, b]) {
      await p.goto("/");
      await p.getByRole("button", { name: "Try the demo" }).click();
      await expect(p).toHaveURL(/\/dashboard$/);
    }
    // A change in one demo doesn't appear in the other.
    await a.goto("/applications?q=monzo");
    await a.locator("tbody tr a").first().click();
    a.once("dialog", (d) => d.accept());
    await a.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(a).toHaveURL(/\/applications$/);
    await b.goto("/applications?q=monzo");
    await expect(b.locator("tbody tr")).toHaveCount(1);
    await first.close();
    await second.close();
  });

  test("the daily job deletes demo accounts after 24 hours", async ({ db, request }) => {
    await db.query(
      `insert into "User" (id,email,"isDemo","createdAt","updatedAt") values
         ('e2e-old-demo','visitor-old@demo.invalid',true, now() - interval '25 hours', now()),
         ('e2e-new-demo','visitor-new@demo.invalid',true, now() - interval '1 hour', now())
       on conflict do nothing`,
    );
    const res = await request.get("/api/cron/reminders", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.ok()).toBe(true);
    const left = await db.query<{ id: string }>(
      `select id from "User" where id in ('e2e-old-demo','e2e-new-demo')`,
    );
    expect(left.map((r) => r.id)).toEqual(["e2e-new-demo"]);
    await db.query(`delete from "User" where id = 'e2e-new-demo'`);
  });

  test("without email or Google configured, sign-in points to the demo", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Account sign-in isn't set up on this site yet.")).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Try the demo" })).toBeVisible();
  });
});

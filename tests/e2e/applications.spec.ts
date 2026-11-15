import { expect, reseed, test } from "./support";

test.describe("applications", () => {
  test.beforeAll(() => reseed());
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test("signed-out visitors are sent to sign in", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/applications");
    await expect(page).toHaveURL(/\/login$/);
    await page.close();
  });

  test("list, search, filter and sort live in the URL", async ({ page }) => {
    await page.goto("/applications");
    await expect(page.locator("tbody tr")).toHaveCount(12);
    await expect(page.locator("tbody")).toContainText(/\d{2}\/\d{2}\/\d{4}/);
    await expect(page.locator("tbody")).toContainText("£");

    await page.getByPlaceholder("Search company, role or city").fill("monzo");
    await expect(page).toHaveURL(/q=monzo/);
    await expect(page.locator("tbody tr")).toHaveCount(1);

    await page.getByPlaceholder("Search company, role or city").fill("");
    await expect(page).not.toHaveURL(/q=/);
    await page.getByRole("button", { name: "Rejected", exact: true }).click();
    await expect(page).toHaveURL(/status=REJECTED/);
    await expect(page.locator("tbody tr")).toHaveCount(2);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(12);

    await page.getByLabel("Sort by").selectOption("closing");
    await expect(page).toHaveURL(/sort=closing/);
    // Sainsbury's closed yesterday: the earliest closing date comes first.
    await expect(page.locator("tbody tr").first()).toContainText("Engineering Manager");

    await page.goto("/applications?status=APPLIED&source=REED");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody")).toContainText("Arm");
  });

  test("create reuses a company and hides the city for remote roles", async ({ page, db }) => {
    await page.goto("/applications/new");
    await page.getByLabel("Company").fill("monzo");
    await page.getByLabel("Job title").fill("Staff Engineer");
    await page.getByLabel("Status").selectOption("APPLIED");
    await page.getByLabel("Work pattern").selectOption("REMOTE");
    await expect(page.getByLabel("City or town")).toHaveCount(0);
    await page.getByLabel("Salary from").fill("£95k");
    await page.getByRole("button", { name: "Add application" }).click();

    await expect(page).toHaveURL(/\/applications\/[a-z0-9]+$/);
    const main = page.locator("main");
    await expect(main).toContainText("From £95,000 per annum");
    await expect(main).toContainText("Monzo");
    const [{ n }] = await db.query<{ n: number }>(
      `select count(*)::int n from "Company" c join "User" u on u.id = c."userId"
       where u.email = 'demo@example.com' and lower(c.name) = 'monzo'`,
    );
    expect(n).toBe(1);
  });

  test("a failed submit keeps every field, including dropdowns", async ({ page }) => {
    await page.goto("/applications/new");
    await page.getByLabel("Job title").fill("Data Engineer");
    await page.getByLabel("Where you found it").selectOption("OTHER");
    await page.getByLabel("Other source").fill("Otta");
    await page.getByLabel("Work pattern").selectOption("REMOTE");
    await page.getByLabel("Contract type").selectOption("CONTRACT");
    await page.getByLabel("IR35 status").selectOption("OUTSIDE");
    await page.getByLabel("Salary from").fill("£600/day");
    await page.getByLabel("Closing date").fill("12/31/2026");
    await page.getByRole("button", { name: "Add application" }).click();

    await expect(page.getByText("Enter the company name.")).toBeVisible();
    await expect(page.getByText(/DD\/MM\/YYYY, e\.g\./)).toBeVisible();
    await expect(page.getByLabel("Where you found it")).toHaveValue("OTHER");
    await expect(page.getByLabel("Work pattern")).toHaveValue("REMOTE");
    await expect(page.getByLabel("Contract type")).toHaveValue("CONTRACT");
    await expect(page.getByLabel("IR35 status")).toHaveValue("OUTSIDE");
    await expect(page.getByLabel("Salary from")).toHaveValue("£600/day");

    await page.getByLabel("Company").fill("Ocado Technology");
    await page.getByLabel("Closing date").fill("31/12/2026");
    await page.getByRole("button", { name: "Add application" }).click();
    await expect(page).toHaveURL(/\/applications\/[a-z0-9]+$/);
    const main = page.locator("main");
    await expect(main).toContainText("Otta");
    await expect(main).toContainText("Contract · Outside IR35");
    await expect(main).toContainText("From £600 per day");
    await expect(main).toContainText("31/12/2026");
  });

  test("status changes are recorded in the history", async ({ page }) => {
    await page.goto("/applications?q=skyscanner");
    await page.locator("tbody tr a").first().click();
    await page.getByLabel("Move to").selectOption("INTERVIEW");
    await page.getByLabel("Note (optional)").fill("Phone screen booked");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Status updated")).toBeVisible();
    const history = page.locator("[data-slot=card]", { hasText: "History" });
    await expect(history).toContainText("from Applied");
    await expect(history).toContainText("Phone screen booked");
  });

  test("delete removes an application", async ({ page }) => {
    await page.goto("/applications?q=ocado");
    await page.locator("tbody tr a").first().click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/applications$/);
    await page.goto("/applications?q=ocado");
    await expect(page.getByText("No applications match these filters.")).toBeVisible();
  });

  test("another user's application is not visible", async ({ page, db }) => {
    await db.query(
      `insert into "User" (id,email,"updatedAt") values ('e2e-other','other@example.com',now()) on conflict do nothing`,
    );
    await db.query(
      `insert into "Company" (id,"userId",name,"updatedAt") values ('e2e-other-co','e2e-other','Secret Ltd',now()) on conflict do nothing`,
    );
    await db.query(
      `insert into "Application" (id,"userId","companyId","roleTitle","updatedAt") values ('e2e-other-app','e2e-other','e2e-other-co','Secret role',now()) on conflict do nothing`,
    );
    await page.goto("/applications/e2e-other-app");
    await expect(page.getByText("Application not found")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Secret role");
    await db.query(`delete from "User" where id = 'e2e-other'`);
  });
});

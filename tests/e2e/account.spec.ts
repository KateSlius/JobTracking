import { strFromU8, unzipSync } from "fflate";
import { clearOutbox, expect, readOutbox, reseed, test } from "./support";

test.describe("settings, export and account deletion", () => {
  test.beforeAll(() => {
    reseed();
    clearOutbox();
  });
  // Leave a working demo user for whatever runs next.
  test.afterAll(() => reseed());
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test("account menu reaches settings; profile name saves", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Account menu/ }).click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);

    await page.getByLabel("Name").fill("Demo Person");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue("Demo Person");
    await expect(page.getByText("CV v3 – Backend")).toBeVisible();
  });

  test("export downloads a ZIP of everything, safe for spreadsheets", async ({ page, db }) => {
    // A note that would run as a formula if opened unguarded in Excel.
    await db.query(
      `update "Application" set notes = '=HYPERLINK("http://example.com","x")'
       where "roleTitle" = 'Platform Engineer'`,
    );
    await page.goto("/settings/privacy");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Download my data" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^job-tracker-export-\d{4}-\d{2}-\d{2}\.zip$/);
    const path = await download.path();
    const { readFileSync } = await import("node:fs");
    const files = unzipSync(new Uint8Array(readFileSync(path)));
    const names = Object.keys(files).sort();
    expect(names).toEqual(
      [
        "README.txt",
        "applications.csv",
        "companies.csv",
        "contacts.csv",
        "data.json",
        "documents.csv",
        "interviews.csv",
        "notifications.csv",
        "profile.csv",
        "reminders.csv",
        "status_history.csv",
      ].sort(),
    );
    const apps = strFromU8(files["applications.csv"]);
    expect(apps.split("\r\n").filter(Boolean)).toHaveLength(13); // header + 12
    expect(apps).toContain(`"'=HYPERLINK(""http://example.com"",""x"")"`);
    const data = JSON.parse(strFromU8(files["data.json"]));
    expect(data.profile.email).toBe("demo@example.com");
    expect(JSON.stringify(data)).not.toMatch(/sessionToken|access_token|refresh_token/);
  });

  test("deleting needs the exact email, then removes everything", async ({ page, db, context }) => {
    await page.goto("/settings/privacy");
    const button = page.getByRole("button", { name: "Delete my account and data" });
    await expect(button).toBeDisabled();
    await page.getByLabel(/to confirm/).fill("someone@else.com");
    await expect(button).toBeDisabled();
    await page.getByLabel(/to confirm/).fill("DEMO@example.com");
    await expect(button).toBeEnabled();
    await button.click();

    await expect(page).toHaveURL(/\/goodbye$/);
    await expect(
      page.getByRole("heading", { name: "Your account has been deleted" }),
    ).toBeVisible();

    const counts = await db.query<{ t: string; n: number }>(
      `select 'user' t, count(*)::int n from "User" where email = 'demo@example.com'
       union all select 'applications', count(*)::int from "Application" a
         left join "User" u on u.id = a."userId" where u.id is null
       union all select 'orphan reminders', count(*)::int from "Reminder" r
         left join "User" u on u.id = r."userId" where u.id is null
       union all select 'orphan companies', count(*)::int from "Company" c
         left join "User" u on u.id = c."userId" where u.id is null`,
    );
    for (const { t, n } of counts) expect(n, t).toBe(0);

    const goodbye = readOutbox().find(
      (e) => e.subject === "Your Job Tracker account has been deleted",
    );
    expect(goodbye?.to).toBe("demo@example.com");

    // The old session no longer works.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    expect((await context.cookies()).some((c) => c.name === "authjs.session-token")).toBe(false);
  });
});

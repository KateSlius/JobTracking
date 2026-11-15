import AxeBuilder from "@axe-core/playwright";
import { expect, reseed, test } from "./support";

/** Serious and critical WCAG 2.2 AA problems fail the build; minor ones are reported only. */
async function scan(page: import("@playwright/test").Page) {
  // @axe-core/playwright resolves its own playwright-core, so its Page type differs from
  // @playwright/test's in name only. Same object at runtime.
  const results = await new AxeBuilder({
    page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"],
  })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} → ${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 3)
          .join(", ")}`,
    );
}

const publicPages = ["/", "/login", "/privacy", "/terms"];
const appPages = [
  "/dashboard",
  "/applications",
  "/applications?view=board",
  "/applications/new",
  "/calendar",
  "/reminders",
  "/settings",
  "/settings/privacy",
];

test.describe("accessibility", () => {
  test.beforeAll(() => reseed());

  for (const url of publicPages) {
    test(`public page ${url}`, async ({ page }) => {
      await page.goto(url);
      expect(await scan(page)).toEqual([]);
    });
  }

  for (const url of appPages) {
    test(`app page ${url}`, async ({ page, signIn }) => {
      await signIn();
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      expect(await scan(page)).toEqual([]);
    });
  }

  test("an application's page", async ({ page, signIn }) => {
    await signIn();
    await page.goto("/applications?q=monzo");
    await page.locator("tbody tr a").first().click();
    await page.getByText("Job details", { exact: true }).waitFor();
    expect(await scan(page)).toEqual([]);
  });

  test("skip link jumps to the content", async ({ page, signIn }) => {
    await signIn();
    await page.goto("/dashboard");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });
});

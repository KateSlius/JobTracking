import { expect, reseed, test } from "./support";

const card = (page: import("@playwright/test").Page, title: string) =>
  page.locator("[data-slot=card]", { has: page.getByText(title, { exact: true }) });

test.describe("dashboard", () => {
  test.beforeAll(() => reseed());
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test("headline figures, pipeline and status totals", async ({ page }) => {
    await page.goto("/dashboard");
    const tile = (label: string) =>
      page.locator("div.rounded-lg.border", { has: page.getByText(label, { exact: true }) });

    // Date-independent figures from the seed data.
    await expect(tile("Response rate")).toContainText("67%");
    await expect(tile("Response rate")).toContainText("6 of 9 applications heard back");
    await expect(tile("Active applications")).toContainText("6");
    await expect(tile("Active applications")).toContainText("3 saved to apply for");
    await expect(tile("Applied this week")).toContainText(/\d+ last week/);

    const rows = page.locator("ol li");
    await expect(rows.nth(0)).toContainText("Applied");
    await expect(rows.nth(0)).toContainText("9");
    await expect(rows.nth(1)).toContainText("4 · 44%");
    await expect(rows.nth(2)).toContainText("3 · 33%");
    await expect(rows.nth(3)).toContainText("1 · 11%");
    await rows.nth(2).hover();
    await expect(rows.nth(2).getByRole("tooltip")).toContainText("75%");

    const byStatus = card(page, "By status");
    for (const [status, n] of [
      ["Saved", 3],
      ["Applied", 2],
      ["Interview", 2],
      ["Rejected", 2],
    ] as const) {
      await expect(
        byStatus.getByRole("link", { name: new RegExp(`${status}\\s*${n}`) }),
      ).toBeVisible();
    }
  });

  test("needs attention lists each thing once", async ({ page }) => {
    await page.goto("/dashboard");
    const attention = card(page, "Needs attention");
    await expect(attention).toContainText("Follow up: Full Stack Engineer at Skyscanner");
    // HMRC has a closing-date reminder and a "closes soon" row; only the row is shown.
    await expect(attention.getByText(/HMRC/)).toHaveCount(1);
    await expect(card(page, "Upcoming interviews")).toContainText("Monzo");
  });

  test("weekly chart has a table view and capped bars", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("View as table").click();
    await expect(page.locator("details table tbody tr")).toHaveCount(8);
    const widths = await page
      .locator(".recharts-bar-rectangle path")
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    expect(widths.length).toBeGreaterThan(0);
    expect(Math.max(...widths)).toBeLessThanOrEqual(24.5);
  });
});

test.describe("kanban board", () => {
  test.beforeAll(() => reseed());
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  const column = (page: import("@playwright/test").Page, name: string) =>
    page.locator("section", { has: page.locator("h2", { hasText: name }) });

  /** The server-rendered board is visible before React hydrates it. dnd-kit's live region only
   *  exists once the board has mounted in the browser, so it's the "ready to drag" signal. */
  const boardReady = async (page: import("@playwright/test").Page) => {
    await page.goto("/applications?view=board");
    await page.locator("[id^=DndLiveRegion]").waitFor({ state: "attached" });
  };

  const statusOf = async (
    db: { query: <T>(sql: string, p?: unknown[]) => Promise<T[]> },
    role: string,
  ) => {
    const [row] = await db.query<{ status: string }>(
      `select a.status from "Application" a join "User" u on u.id = a."userId"
       where u.email = 'demo@example.com' and a."roleTitle" = $1`,
      [role],
    );
    return row?.status;
  };

  test("drag with the mouse moves a card and records it", async ({ page, db }) => {
    await boardReady(page);
    await expect(page.locator("section h2")).toHaveCount(7);
    const card = page.locator("article", { hasText: "Software Engineer, Developer Tools" });
    await card.waitFor();
    const from = (await card.boundingBox())!;
    const to = (await column(page, "Interview").boundingBox())!;
    await page.mouse.move(from.x + 40, from.y + 20);
    await page.mouse.down();
    await page.mouse.move(from.x + 60, from.y + 30, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 15 });
    await page.mouse.up();

    await expect(column(page, "Interview").getByText("Developer Tools")).toBeVisible();
    await expect.poll(() => statusOf(db, "Software Engineer, Developer Tools")).toBe("INTERVIEW");
  });

  test("move with the keyboard and hear where it went", async ({ page, db }) => {
    await boardReady(page);
    const live = page.locator("[id^=DndLiveRegion]");
    await page.getByRole("button", { name: "Move Full Stack Engineer at Skyscanner" }).focus();
    // Wait for each announcement: they confirm the step happened (and are what screen reader
    // users hear), and give the board time to measure its columns before the arrow key.
    await page.keyboard.press("Space");
    // "Picked up …" is announced first, then replaced by where the card is now.
    await expect(live).toContainText("Full Stack Engineer at Skyscanner is over Applied.");
    // dnd-kit starts listening for arrow keys on the next tick after the drag starts; a test can
    // press faster than any person, so let two frames pass first.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
    );
    await page.keyboard.press("ArrowRight");
    await expect(live).toContainText("is over Assessment.");
    await page.keyboard.press("Space");
    await expect.poll(() => statusOf(db, "Full Stack Engineer")).toBe("ASSESSMENT");
    await expect(page.locator("[id^=DndLiveRegion]")).toContainText("moved to Assessment");
  });

  test("no sideways page scroll on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const url of ["/dashboard", "/applications?view=board", "/calendar", "/reminders"]) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, url).toBeLessThanOrEqual(0);
    }
  });
});

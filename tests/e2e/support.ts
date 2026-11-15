import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import pg from "pg";
import { test as base, expect, type BrowserContext } from "@playwright/test";

export { expect };

export const DEMO_EMAIL = "demo@example.com";
export const CRON_SECRET = "e2e-cron-secret";
export const OUTBOX = path.join(process.cwd(), "test-results", "outbox");

// These tests reseed and delete data. Never let them near a hosted database.
const dbUrl = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl) && process.env.E2E_ALLOW_REMOTE_DB !== "1") {
  throw new Error(
    "E2E tests only run against a local database (DATABASE_URL must point at localhost).",
  );
}

/** Recreates the demo user and their data. Seed dates are relative to now. */
export function reseed() {
  execSync("npx prisma db seed", { stdio: "ignore" });
}

export function clearOutbox() {
  rmSync(OUTBOX, { recursive: true, force: true });
}

export function readOutbox(): { to: string; subject: string; text: string; html: string }[] {
  if (!existsSync(OUTBOX)) return [];
  return readdirSync(OUTBOX)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(OUTBOX, f), "utf8")));
}

/** London calendar date `days` from today as "Wed 18 Nov" (matches the app's formatEventTime). */
export function londonDay(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(d)
    .replace(",", "");
}

/** London calendar date `days` from today as "DD/MM/YYYY". */
export function londonDate(days: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London" }).format(
    new Date(Date.now() + days * 86_400_000),
  );
}

type Db = {
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
};

export const test = base.extend<
  { signIn: (context?: BrowserContext) => Promise<string> },
  { db: Db }
>({
  db: [
    async ({}, use) => {
      const client = new pg.Client({ connectionString: dbUrl });
      await client.connect();
      // Local `prisma dev` serves one connection at a time and occasionally rejects a query
      // when the server is busy (08P01). Retry those; real errors still fail the test.
      const query: Db["query"] = async (sql, params = []) => {
        for (let attempt = 0; ; attempt++) {
          try {
            return (await client.query(sql, params)).rows;
          } catch (error) {
            if ((error as { code?: string }).code !== "08P01" || attempt >= 4) throw error;
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      };
      await use({ query });
      await client.end();
    },
    { scope: "worker" },
  ],

  /** Signs the demo user in by creating a session row, as Auth.js does. Returns the user id. */
  signIn: async ({ context, db }, use) => {
    const tokens: string[] = [];
    await use(async (target = context) => {
      const [user] = await db.query<{ id: string }>(`select id from "User" where email = $1`, [
        DEMO_EMAIL,
      ]);
      const token = randomBytes(32).toString("hex");
      tokens.push(token);
      await db.query(
        `insert into "Session" ("sessionToken","userId",expires,"updatedAt") values ($1,$2,now()+interval '1 day',now())`,
        [token, user.id],
      );
      await target.addCookies([
        { name: "authjs.session-token", value: token, url: "http://localhost:3100" },
      ]);
      return user.id;
    });
    for (const token of tokens) {
      await db.query(`delete from "Session" where "sessionToken" = $1`, [token]).catch(() => {});
    }
  },
});

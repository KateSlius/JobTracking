"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_EMAIL_DOMAIN } from "@/lib/auth";
import { db } from "@/lib/db";
import { addSampleData } from "@/lib/demo/sample-data";
import { DEMO_ACCOUNT_HOURS } from "@/server/services/reminder-job";

/** Free-tier database protection: at most this many new demo accounts per hour, site-wide. */
const DEMO_ACCOUNTS_PER_HOUR = 100;

export type DemoState = { error?: string };

/**
 * "Try the demo": a private account filled with the sample job search, signed in straight away.
 * Each visitor gets their own copy, so nobody sees anyone else's changes. The daily job deletes
 * demo accounts after 24 hours, and demo addresses (.invalid) can never receive email.
 */
export async function startDemoAction(): Promise<DemoState> {
  const now = new Date();
  const recent = await db.user.count({
    where: { isDemo: true, createdAt: { gt: new Date(now.getTime() - 3_600_000) } },
  });
  if (recent >= DEMO_ACCOUNTS_PER_HOUR) {
    return { error: "The demo is busy right now. Please try again in an hour." };
  }

  const expires = new Date(now.getTime() + DEMO_ACCOUNT_HOURS * 3_600_000);
  const sessionToken = randomBytes(32).toString("hex");
  await db.$transaction(
    async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `visitor-${randomUUID()}@${DEMO_EMAIL_DOMAIN}`,
          name: "Demo visitor",
          isDemo: true,
          emailRemindersEnabled: false,
          emailVerified: now,
        },
      });
      await addSampleData(tx, user.id);
      // A database session, exactly as Auth.js creates one after a normal sign-in.
      await tx.session.create({ data: { sessionToken, userId: user.id, expires } });
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  // Auth.js uses the __Secure- prefix on HTTPS; match it so auth() finds the session.
  const secure =
    (await headers()).get("x-forwarded-proto") === "https" ||
    (process.env.APP_URL ?? "").startsWith("https://");
  (await cookies()).set(
    secure ? "__Secure-authjs.session-token" : "authjs.session-token",
    sessionToken,
    {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      expires,
    },
  );
  redirect("/dashboard");
}

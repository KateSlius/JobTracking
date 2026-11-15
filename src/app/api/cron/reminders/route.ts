import { timingSafeEqual } from "node:crypto";
import { runReminderJob } from "@/server/services/reminder-job";

// Called by Vercel Cron (see vercel.json), which sends "Authorization: Bearer $CRON_SECRET".
// Locally: npm run reminders:run

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // Never run unprotected.
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }
  const result = await runReminderJob();
  return Response.json(result, { status: result.emailsFailed ? 207 : 200 });
}

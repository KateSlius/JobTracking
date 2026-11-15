// Runs the reminders job against a local server, the same way Vercel Cron calls it.
// Usage: npm run reminders:run   (needs `npm run dev` or `npm start` running)
import "dotenv/config";

const base = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("Set CRON_SECRET in .env first.");
  process.exit(1);
}
const response = await fetch(`${base}/api/cron/reminders`, {
  headers: { Authorization: `Bearer ${secret}` },
});
console.log(response.status, await response.text());
process.exitCode = response.ok ? 0 : 1;

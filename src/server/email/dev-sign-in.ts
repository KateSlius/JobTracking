import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { sendEmail } from "./send";

/**
 * Local development without a Resend key: sign-in links go to the .outbox folder instead of
 * being emailed, and /login/check-email shows the latest one as a button. Never active in
 * production builds (NODE_ENV is "production" there) or once AUTH_RESEND_KEY is set.
 */
export const devSignInLinks =
  process.env.NODE_ENV === "development" && !process.env.AUTH_RESEND_KEY;

const SUBJECT = "Sign in to Job Tracker";

export async function sendDevSignInLink({ identifier, url }: { identifier: string; url: string }) {
  await sendEmail({
    to: identifier,
    subject: SUBJECT,
    text: `Sign in to Job Tracker:\n${url}`,
    html: `<p><a href="${url.replace(/"/g, "&quot;")}">Sign in to Job Tracker</a></p>`,
  });
  console.info(`[dev] Sign-in link for ${identifier}: ${url}`);
}

/** The newest dev sign-in link from the last 15 minutes, if any. */
export async function latestDevSignInLink(): Promise<{ to: string; url: string } | null> {
  const dir = process.env.EMAIL_OUTBOX_DIR ?? path.join(process.cwd(), ".outbox");
  const files = await readdir(dir).catch(() => []);
  const cutoff = Date.now() - 15 * 60_000;
  for (const file of files
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()) {
    const email = JSON.parse(await readFile(path.join(dir, file), "utf8")) as {
      to: string;
      subject: string;
      text: string;
    };
    if (email.subject !== SUBJECT) continue;
    // Outbox file names start with an ISO timestamp (":" and "." replaced by "-").
    const stamp = file
      .slice(0, 24)
      .replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "$1:$2:$3.$4Z");
    if (Date.parse(stamp) < cutoff) return null;
    const url = email.text.split("\n").find((line) => line.startsWith("http"));
    return url ? { to: email.to, url } : null;
  }
  return null;
}

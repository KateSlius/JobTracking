/**
 * The reminder email: everything that fell due since the last run, in one message.
 * Pure (no sending), so the wording and escaping are unit-tested.
 */
import { formatEventTime } from "@/lib/format";

export type DigestReminder = {
  title: string;
  dueAt: Date;
  applicationId: string | null;
};

export type DigestEmail = { subject: string; html: string; text: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function subjectFor(reminders: DigestReminder[]): string {
  const [first] = reminders;
  if (reminders.length === 1) return `Reminder: ${first.title}`;
  return `${reminders.length} reminders: ${first.title} and ${reminders.length - 1} more`;
}

export function buildReminderDigest({
  name,
  reminders,
  appUrl,
}: {
  name: string | null;
  reminders: DigestReminder[];
  appUrl: string;
}): DigestEmail {
  const base = appUrl.replace(/\/$/, "");
  const linkFor = (r: DigestReminder) =>
    r.applicationId ? `${base}/applications/${r.applicationId}` : `${base}/reminders`;
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi,";
  const intro =
    reminders.length === 1
      ? "You have a reminder due:"
      : `You have ${reminders.length} reminders due:`;
  const settingsUrl = `${base}/reminders`;

  const text = [
    greeting,
    "",
    intro,
    "",
    ...reminders.map((r) => `• ${r.title}\n  Due ${formatEventTime(r.dueAt)}\n  ${linkFor(r)}`),
    "",
    `See all your reminders: ${base}/reminders`,
    "",
    "—",
    "You're getting this because email reminders are switched on in Job Tracker.",
    `To turn them off, go to ${settingsUrl}`,
  ].join("\n");

  // Inline styles only: many email clients strip <style> blocks.
  const items = reminders
    .map(
      (r) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;">
          <a href="${escapeHtml(linkFor(r))}" style="color:#0a0a0a;font-weight:600;text-decoration:none;">${escapeHtml(r.title)}</a>
          <div style="color:#737373;font-size:13px;margin-top:2px;">Due ${escapeHtml(formatEventTime(r.dueAt))}</div>
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en-GB">
  <body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;">
      <tr><td style="padding:24px;">
        <p style="margin:0 0 8px;">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 8px;">${escapeHtml(intro)}</p>
        <table role="presentation" width="100%">${items}
        </table>
        <p style="margin:20px 0 0;"><a href="${escapeHtml(`${base}/reminders`)}" style="display:inline-block;background:#171717;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;">See all reminders</a></p>
      </td></tr>
    </table>
    <p style="max-width:560px;margin:16px auto 0;color:#737373;font-size:12px;">
      You're getting this because email reminders are switched on in Job Tracker.
      <a href="${escapeHtml(settingsUrl)}" style="color:#737373;">Turn them off</a>.
    </p>
  </body>
</html>`;

  return { subject: subjectFor(reminders), html, text };
}

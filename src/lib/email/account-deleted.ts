import { escapeHtml } from "./reminder-digest";

/** Sent to the address being deleted, so the person has a record. Pure, so it's tested. */
export function buildAccountDeletedEmail({ name, when }: { name: string | null; when: Date }) {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi,";
  const at = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "long",
    timeStyle: "short",
  }).format(when);
  const body = [
    greeting,
    "",
    `Your Job Tracker account and everything in it were deleted on ${at} (UK time).`,
    "That includes your applications, interviews, reminders, contacts and notes.",
    "",
    "We won't email you again. If you didn't ask for this, reply to this email.",
  ];
  return {
    subject: "Your Job Tracker account has been deleted",
    text: body.join("\n"),
    html: `<!doctype html><html lang="en-GB"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a;padding:24px;">${body
      .map((line) => (line ? `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>` : ""))
      .join("")}</body></html>`,
  };
}

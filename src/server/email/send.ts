import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Resend drops a repeat send with the same key within 24 hours: a second guard against duplicates. */
  idempotencyKey?: string;
};

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

type Transport = "resend" | "outbox";

/**
 * EMAIL_TRANSPORT=resend|outbox picks explicitly. Otherwise: Resend when AUTH_RESEND_KEY is set;
 * in development, the outbox (JSON + HTML files in EMAIL_OUTBOX_DIR, default ./.outbox) so the
 * whole flow works without a key. In production with no key, sending fails loudly.
 */
function transport(): Transport | null {
  const chosen = process.env.EMAIL_TRANSPORT;
  if (chosen === "resend" || chosen === "outbox") return chosen;
  if (process.env.AUTH_RESEND_KEY) return "resend";
  return process.env.NODE_ENV === "production" ? null : "outbox";
}

export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  // .invalid is reserved and can never receive mail (RFC 2606); demo accounts use it.
  if (/\.invalid$/i.test(email.to)) return { ok: true, id: "skipped-invalid-domain" };
  const mode = transport();

  if (mode === "outbox") {
    const dir = process.env.EMAIL_OUTBOX_DIR ?? path.join(process.cwd(), ".outbox");
    await mkdir(dir, { recursive: true });
    const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    await writeFile(path.join(dir, `${id}.json`), JSON.stringify({ id, ...email }, null, 2));
    await writeFile(path.join(dir, `${id}.html`), email.html);
    return { ok: true, id };
  }

  if (mode === "resend") {
    const key = process.env.AUTH_RESEND_KEY;
    if (!key) return { ok: false, error: "AUTH_RESEND_KEY is not set" };
    const { data, error } = await new Resend(key).emails.send(
      {
        from: process.env.EMAIL_FROM ?? "Job Tracker <onboarding@resend.dev>",
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
    );
    if (error || !data) return { ok: false, error: error?.message ?? "Unknown Resend error" };
    return { ok: true, id: data.id };
  }

  return { ok: false, error: "Email is not configured: set AUTH_RESEND_KEY" };
}

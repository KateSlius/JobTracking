"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildAccountDeletedEmail } from "@/lib/email/account-deleted";
import { sendEmail } from "@/server/email/send";
import { deleteAccount } from "@/server/services/account";

export type ProfileState = { error?: string; savedAt?: number; name?: string };

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length > 100) return { error: "Keep your name under 100 characters.", name };
  await db.user.update({ where: { id: user.id }, data: { name: name || null } });
  refresh();
  return { savedAt: Date.now() };
}

/** Applications that used it keep everything else; their CV field just becomes empty. */
export async function deleteDocumentVersionAction(id: string) {
  const user = await requireUser();
  await db.documentVersion.deleteMany({ where: { id, userId: user.id } });
  refresh();
}

export type DeleteAccountState = { error?: string };

export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser();
  const typed = String(formData.get("confirmEmail") ?? "")
    .trim()
    .toLowerCase();
  if (typed !== user.email.toLowerCase()) {
    return { error: "That doesn't match your email address. Nothing has been deleted." };
  }

  const deleted = await deleteAccount(user.id);

  // Best effort: the account is already gone, so a failed email must not undo or block that.
  const email = buildAccountDeletedEmail({ name: deleted.name, when: new Date() });
  await sendEmail({ to: deleted.email, ...email }).catch((error: unknown) => {
    console.error("Account deleted, but the confirmation email failed:", error);
  });

  // The session row went with the user; clear the cookie too.
  const jar = await cookies();
  jar.delete("authjs.session-token");
  jar.delete("__Secure-authjs.session-token");
  redirect("/goodbye");
}

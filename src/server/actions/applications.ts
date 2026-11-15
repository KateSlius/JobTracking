"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import {
  formDataToValues,
  parseApplicationValues,
  type ApplicationField,
  type ApplicationFormValues,
} from "@/lib/validation/application";
import {
  createApplication,
  deleteApplication,
  updateApplication,
} from "@/server/services/applications";
import { ApplicationNotFoundError, changeStatus } from "@/server/services/status";

// Every action re-checks the session itself. Never trust that the page that rendered the
// form was protected: Server Actions are public POST endpoints.

export type ApplicationFormState = {
  errors?: Partial<Record<ApplicationField, string>>;
  values?: ApplicationFormValues;
  message?: string;
};

export async function createApplicationAction(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const user = await requireUser();
  const values = formDataToValues(formData);
  const parsed = parseApplicationValues(values);
  if (!parsed.ok) {
    return { errors: parsed.errors, values, message: "Please fix the highlighted fields." };
  }

  const app = await createApplication(user.id, parsed.data);
  redirect(`/applications/${app.id}`);
}

export async function updateApplicationAction(
  id: string,
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const user = await requireUser();
  const values = formDataToValues(formData);
  const parsed = parseApplicationValues(values);
  if (!parsed.ok) {
    return { errors: parsed.errors, values, message: "Please fix the highlighted fields." };
  }

  try {
    await updateApplication(user.id, id, parsed.data);
  } catch (error) {
    if (error instanceof ApplicationNotFoundError)
      return { message: "This application no longer exists." };
    throw error;
  }
  redirect(`/applications/${id}`);
}

export type StatusActionState = { error?: string; ok?: boolean };

export async function changeStatusAction(
  id: string,
  _prev: StatusActionState,
  formData: FormData,
): Promise<StatusActionState> {
  const user = await requireUser();
  const toStatus = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 1000);

  if (!(Object.values(ApplicationStatus) as string[]).includes(toStatus)) {
    return { error: "Pick a valid status." };
  }

  try {
    await changeStatus({
      userId: user.id,
      applicationId: id,
      toStatus: toStatus as ApplicationStatus,
      note,
    });
  } catch (error) {
    if (error instanceof ApplicationNotFoundError)
      return { error: "This application no longer exists." };
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function deleteApplicationAction(id: string): Promise<void> {
  const user = await requireUser();
  try {
    await deleteApplication(user.id, id);
  } catch (error) {
    if (!(error instanceof ApplicationNotFoundError)) throw error;
  }
  redirect("/applications");
}

/** Kanban drop. Same service as the status form, so the move is recorded in the history. */
export async function moveApplicationAction(
  id: string,
  toStatus: string,
): Promise<StatusActionState> {
  const user = await requireUser();
  if (!(Object.values(ApplicationStatus) as string[]).includes(toStatus)) {
    return { error: "Pick a valid status." };
  }
  try {
    await changeStatus({
      userId: user.id,
      applicationId: id,
      toStatus: toStatus as ApplicationStatus,
    });
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      return { error: "This application no longer exists." };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}

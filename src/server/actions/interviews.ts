"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  interviewFormDataToValues,
  parseInterviewValues,
  type InterviewField,
  type InterviewFormValues,
} from "@/lib/validation/interview";
import {
  InterviewNotFoundError,
  createInterview,
  deleteInterview,
  updateInterview,
} from "@/server/services/interviews";

// Every action re-checks the session; Server Actions are public POST endpoints.

export type InterviewFormState = {
  errors?: Partial<Record<InterviewField, string>>;
  values?: InterviewFormValues;
  message?: string;
  /** Changes on each successful save so the form can close and reset. */
  savedAt?: number;
};

async function save(
  values: InterviewFormValues,
  run: (userId: string, data: Parameters<typeof updateInterview>[2]) => Promise<unknown>,
): Promise<InterviewFormState> {
  const user = await requireUser();
  const parsed = parseInterviewValues(values);
  if (!parsed.ok) {
    return { errors: parsed.errors, values, message: "Please fix the highlighted fields." };
  }
  try {
    await run(user.id, parsed.data);
  } catch (error) {
    if (error instanceof InterviewNotFoundError) {
      return { values, message: "This interview or application no longer exists." };
    }
    throw error;
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function createInterviewAction(
  applicationId: string,
  _prev: InterviewFormState,
  formData: FormData,
): Promise<InterviewFormState> {
  return save(interviewFormDataToValues(formData), (userId, data) =>
    createInterview(userId, applicationId, data),
  );
}

export async function updateInterviewAction(
  interviewId: string,
  _prev: InterviewFormState,
  formData: FormData,
): Promise<InterviewFormState> {
  return save(interviewFormDataToValues(formData), (userId, data) =>
    updateInterview(userId, interviewId, data),
  );
}

export async function deleteInterviewAction(interviewId: string): Promise<void> {
  const user = await requireUser();
  try {
    await deleteInterview(user.id, interviewId);
  } catch (error) {
    if (!(error instanceof InterviewNotFoundError)) throw error;
  }
  refresh();
}

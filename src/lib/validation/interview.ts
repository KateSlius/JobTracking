import { z } from "zod";
import { InterviewType } from "@/generated/prisma/enums";
import {
  calendarDateToIso,
  formatClockTime,
  londonWallTimeToUtc,
  parseClockTime,
} from "@/lib/format";
import { fieldErrors, optionalText, ukDate, webUrl } from "./shared";

/** Field names used by the interview form. Keep in sync with interview-form.tsx. */
export const INTERVIEW_FIELDS = [
  "type",
  "stage",
  "date",
  "startTime",
  "endTime",
  "location",
  "meetingUrl",
  "interviewers",
  "prepNotes",
  "outcome",
] as const;

export type InterviewField = (typeof INTERVIEW_FIELDS)[number];
export type InterviewFormValues = Partial<Record<InterviewField, string>>;

/** Used when no end time is given. */
export const DEFAULT_INTERVIEW_MINUTES = 60;

const clockTime = (required: boolean) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") {
        if (required) {
          ctx.addIssue({ code: "custom", message: "Enter a start time, e.g. 14:30." });
          return z.NEVER;
        }
        return null;
      }
      const time = parseClockTime(v);
      if (!time) {
        ctx.addIssue({ code: "custom", message: "Enter a time like 14:30 or 2:30pm." });
        return z.NEVER;
      }
      return formatClockTime(time);
    });

export const interviewSchema = z
  .object({
    type: z.enum(InterviewType, { error: "Choose the type of interview." }),
    stage: optionalText(100),
    date: ukDate,
    startTime: clockTime(true),
    endTime: clockTime(false),
    location: optionalText(300),
    meetingUrl: webUrl,
    interviewers: optionalText(300),
    prepNotes: optionalText(10_000),
    outcome: optionalText(2_000),
  })
  .transform((v, ctx) => {
    if (!v.date) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Enter the interview date." });
      return z.NEVER;
    }
    const isoDate = calendarDateToIso(v.date);
    // Times are London wall-clock times, converted to UTC instants (BST-aware).
    const startsAt = londonWallTimeToUtc(isoDate, v.startTime!);
    const endsAt = v.endTime
      ? londonWallTimeToUtc(isoDate, v.endTime)
      : new Date(startsAt.getTime() + DEFAULT_INTERVIEW_MINUTES * 60_000);

    if (endsAt <= startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "The end time must be after the start time.",
      });
      return z.NEVER;
    }

    return {
      type: v.type,
      stage: v.stage,
      startsAt,
      endsAt,
      // An address only makes sense in person; a link only makes sense remotely.
      location: v.type === "IN_PERSON" || v.type === "ASSESSMENT_CENTRE" ? v.location : null,
      meetingUrl: v.type === "VIDEO" ? v.meetingUrl : null,
      interviewers: v.interviewers,
      prepNotes: v.prepNotes,
      outcome: v.outcome,
    };
  });

export type InterviewInput = z.output<typeof interviewSchema>;

export function interviewFormDataToValues(formData: FormData): InterviewFormValues {
  const values: InterviewFormValues = {};
  for (const field of INTERVIEW_FIELDS) {
    const raw = formData.get(field);
    if (typeof raw === "string") values[field] = raw;
  }
  return values;
}

export type InterviewParseResult =
  | { ok: true; data: InterviewInput }
  | { ok: false; errors: Partial<Record<InterviewField, string>> };

export function parseInterviewValues(values: InterviewFormValues): InterviewParseResult {
  const input = Object.fromEntries(INTERVIEW_FIELDS.map((f) => [f, values[f] ?? ""]));
  const result = interviewSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: fieldErrors<InterviewField>(result.error) };
}

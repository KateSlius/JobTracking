import { z } from "zod";
import {
  calendarDateToIso,
  formatClockTime,
  londonWallTimeToUtc,
  parseClockTime,
} from "@/lib/format";
import { REMINDER_TIME } from "@/lib/reminders/plan";
import { fieldErrors, text, ukDate } from "./shared";

export const REMINDER_FIELDS = ["title", "date", "time", "applicationId"] as const;
export type ReminderField = (typeof REMINDER_FIELDS)[number];
export type ReminderFormValues = Partial<Record<ReminderField, string>>;

export const reminderSchema = z
  .object({
    title: text(200).min(1, "Say what to remind you about."),
    date: ukDate,
    time: z.string().trim(),
    applicationId: z
      .string()
      .trim()
      .transform((v) => v || null),
  })
  .transform((v, ctx) => {
    if (!v.date) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Enter a date as DD/MM/YYYY." });
      return z.NEVER;
    }
    const time = v.time ? parseClockTime(v.time) : parseClockTime(REMINDER_TIME);
    if (!time) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Enter a time like 09:00 or 2pm." });
      return z.NEVER;
    }
    return {
      title: v.title,
      // A London wall-clock time, stored as UTC.
      dueAt: londonWallTimeToUtc(calendarDateToIso(v.date), formatClockTime(time)),
      applicationId: v.applicationId,
    };
  });

export type ReminderInput = z.output<typeof reminderSchema>;

export function parseReminderForm(formData: FormData) {
  const values: ReminderFormValues = {};
  for (const field of REMINDER_FIELDS) {
    const raw = formData.get(field);
    if (typeof raw === "string") values[field] = raw;
  }
  const result = reminderSchema.safeParse(
    Object.fromEntries(REMINDER_FIELDS.map((f) => [f, values[f] ?? ""])),
  );
  return result.success
    ? { ok: true as const, data: result.data, values }
    : { ok: false as const, errors: fieldErrors<ReminderField>(result.error), values };
}

import { z } from "zod";
import { parseUkDate } from "@/lib/format";

/** Field rules shared by the application and interview forms. All take raw form strings. */

export const text = (max: number) =>
  z.string().trim().max(max, `Keep this under ${max} characters.`);

export const optionalText = (max: number) => text(max).transform((v) => (v === "" ? null : v));

export const optionalEnum = <T extends Record<string, string>>(e: T) =>
  z.union([z.literal(""), z.enum(e)]).transform((v) => (v === "" ? null : (v as T[keyof T])));

/** "31/03/2026" → Date at 00:00 UTC; "" → null. */
export const ukDate = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const date = parseUkDate(v);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Enter a date as DD/MM/YYYY, e.g. 31/03/2026." });
      return z.NEVER;
    }
    return date;
  });

/**
 * A web address; adds https:// when missing; "" → null. Always http(s), so it is safe to
 * render as an href (no javascript: or data: URLs).
 */
export const webUrl = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const url = new URL(withProtocol);
      if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) throw new Error();
      return url.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid web address." });
      return z.NEVER;
    }
  });

export const optionalEmail = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    if (!z.email().safeParse(v).success) {
      ctx.addIssue({ code: "custom", message: "Enter a valid email address." });
      return z.NEVER;
    }
    return v.toLowerCase();
  });

/** First error message per top-level field, for showing next to inputs. */
export function fieldErrors<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const errors: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as F | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

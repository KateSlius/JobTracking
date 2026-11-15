import type { SalaryPeriod } from "@/generated/prisma/enums";

export type ParsedSalary = { pence: number; period: SalaryPeriod | null };

const DAY_SUFFIX = /\s*(\/\s*(day|d)|p[./]?d\.?|per\s+day|a\s+day|daily|day\s*rate)\s*$/i;
const ANNUM_SUFFIX =
  /\s*(\/\s*(year|yr|annum|y)|p[./]?a\.?|per\s+(annum|year)|a\s+year|annual(ly)?)\s*$/i;

/**
 * Parses what people type into a salary box.
 *   "£45k" → 4,500,000p · "45,000" → 4,500,000p · "£512.50" → 51,250p
 *   "£500/day" → 50,000p, period DAY · "£45k p.a." → period ANNUM
 * Returns null for empty input, "undefined" for input that is not a valid amount.
 */
export function parseSalary(input: string): ParsedSalary | null | undefined {
  let text = input.trim();
  if (!text) return null;

  let period: SalaryPeriod | null = null;
  if (DAY_SUFFIX.test(text)) {
    period = "DAY";
    text = text.replace(DAY_SUFFIX, "");
  } else if (ANNUM_SUFFIX.test(text)) {
    period = "ANNUM";
    text = text.replace(ANNUM_SUFFIX, "");
  }

  text = text.replace(/^£\s*/, "").replace(/,/g, "").replace(/\s+/g, "").toLowerCase();

  const match = /^(\d+(?:\.\d+)?)(k)?$/.exec(text);
  if (!match) return undefined;

  const amount = Number(match[1]) * (match[2] ? 1000 : 1);
  const pence = Math.round(amount * 100);
  if (!Number.isFinite(pence) || pence <= 0 || pence > 100_000_000_00) return undefined;

  return { pence, period };
}

/** Pence → what to show back in an edit form: "45000", "512.50". */
export function penceToInput(pence: number | null | undefined): string {
  if (pence == null) return "";
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

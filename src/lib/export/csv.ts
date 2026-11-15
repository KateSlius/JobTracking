/**
 * RFC 4180 CSV, safe to open in Excel or Google Sheets.
 *
 * Formula injection: a text cell starting with = + - @ (or a tab/carriage return) can run as a
 * formula when the file is opened in a spreadsheet. Those cells get a leading apostrophe, which
 * spreadsheets display as plain text. Numbers are written as numbers, so negatives are unaffected.
 */

export type CsvValue = string | number | boolean | Date | null | undefined;
export type CsvColumn<T> = { header: string; value: (row: T) => CsvValue };

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (value instanceof Date) text = value.toISOString();
  else if (typeof value === "number") text = Number.isFinite(value) ? String(value) : "";
  else if (typeof value === "boolean") text = value ? "true" : "false";
  else text = FORMULA_START.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows → CSV text with a header row, CRLF line endings and a UTF-8 BOM (so Excel reads £ and é). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map((c) => csvCell(c.header)).join(","),
    ...rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

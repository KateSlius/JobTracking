import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("leaves plain text alone", () => {
    expect(csvCell("Monzo")).toBe("Monzo");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("London, UK")).toBe('"London, UK"');
    expect(csvCell('Said "hello"')).toBe('"Said ""hello"""');
    expect(csvCell("line 1\nline 2")).toBe('"line 1\nline 2"');
  });

  it("neutralises spreadsheet formulas in text", () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+44 20 7946 0000")).toBe("'+44 20 7946 0000");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("writes numbers, booleans, dates and blanks", () => {
    expect(csvCell(-1)).toBe("-1");
    expect(csvCell(450.5)).toBe("450.5");
    expect(csvCell(true)).toBe("true");
    expect(csvCell(new Date("2026-11-18T10:00:00Z"))).toBe("2026-11-18T10:00:00.000Z");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });
});

describe("toCsv", () => {
  it("writes a BOM, a header row and CRLF rows", () => {
    const csv = toCsv(
      [
        { name: "Monzo", city: "London" },
        { name: "Skyscanner", city: "Edinburgh, Scotland" },
      ],
      [
        { header: "Company", value: (r) => r.name },
        { header: "City", value: (r) => r.city },
      ],
    );
    expect(csv).toBe('﻿Company,City\r\nMonzo,London\r\nSkyscanner,"Edinburgh, Scotland"\r\n');
  });

  it("writes just the header for no rows", () => {
    expect(toCsv([], [{ header: "A", value: () => 1 }])).toBe("﻿A\r\n");
  });
});

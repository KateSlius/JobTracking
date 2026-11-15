import { describe, expect, it } from "vitest";
import { parseSalary, penceToInput } from "./salary";

describe("parseSalary", () => {
  it.each([
    ["45000", 4_500_000],
    ["45,000", 4_500_000],
    ["£45,000", 4_500_000],
    ["£ 45,000", 4_500_000],
    ["45k", 4_500_000],
    ["£45K", 4_500_000],
    ["£47.5k", 4_750_000],
    ["£512.50", 51_250],
  ])("parses %s", (input, pence) => {
    expect(parseSalary(input)).toEqual({ pence, period: null });
  });

  it.each([
    "£500/day",
    "500 p/d",
    "£500 pd",
    "£500 p.d.",
    "500 per day",
    "£500 a day",
    "500 daily",
  ])("detects a day rate in %s", (input) => {
    expect(parseSalary(input)).toEqual({ pence: 50_000, period: "DAY" });
  });

  it.each(["£45k pa", "£45k p/a", "45k p.a.", "£45,000 per annum", "45000/year", "45k a year"])(
    "detects an annual salary in %s",
    (input) => {
      expect(parseSalary(input)).toEqual({ pence: 4_500_000, period: "ANNUM" });
    },
  );

  it("returns null for empty input", () => {
    expect(parseSalary("")).toBeNull();
    expect(parseSalary("   ")).toBeNull();
  });

  it.each(["competitive", "£", "45-55k", "$45,000", "0", "-5000", "45kk"])(
    "rejects %s",
    (input) => {
      expect(parseSalary(input)).toBeUndefined();
    },
  );
});

describe("penceToInput", () => {
  it("drops pence for whole pounds", () => {
    expect(penceToInput(4_500_000)).toBe("45000");
  });
  it("keeps pence when present", () => {
    expect(penceToInput(51_250)).toBe("512.50");
  });
  it("returns empty for null", () => {
    expect(penceToInput(null)).toBe("");
  });
});

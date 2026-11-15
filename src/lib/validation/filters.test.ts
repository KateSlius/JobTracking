import { describe, expect, it } from "vitest";
import { filtersToSearchParams, parseFilters } from "./filters";

describe("parseFilters", () => {
  it("returns defaults for empty params", () => {
    expect(parseFilters({})).toEqual({
      q: "",
      status: [],
      source: null,
      location: null,
      sort: "updated",
      dir: "desc",
      page: 1,
    });
  });

  it("parses a comma list of statuses, ignoring unknown and duplicate values", () => {
    expect(parseFilters({ status: "applied,INTERVIEW,hired,applied" }).status).toEqual([
      "APPLIED",
      "INTERVIEW",
    ]);
  });

  it("uses the sort's natural direction when dir is missing", () => {
    expect(parseFilters({ sort: "closing" })).toMatchObject({ sort: "closing", dir: "asc" });
  });

  it("falls back on junk", () => {
    expect(parseFilters({ sort: "drop table", page: "-3", source: "monster" })).toMatchObject({
      sort: "updated",
      page: 1,
      source: null,
    });
  });

  it("round-trips through the URL and omits defaults", () => {
    const f = parseFilters({ q: "engineer", status: "APPLIED", sort: "closing", page: "2" });
    const params = filtersToSearchParams(f);
    expect(params.toString()).toBe("q=engineer&status=APPLIED&sort=closing&page=2");
    expect(parseFilters(Object.fromEntries(params))).toEqual(f);
    expect(filtersToSearchParams(parseFilters({})).toString()).toBe("");
  });
});

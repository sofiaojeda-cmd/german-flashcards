import { describe, it, expect } from "vitest";
import { cumulativeLevels, sortLevels, CEFR_ORDER } from "./levels";

describe("cumulativeLevels", () => {
  it("includes every level below the one given", () => {
    expect(cumulativeLevels("B1")).toEqual(["A1", "A2", "B1"]);
  });

  it("returns a single level for the lowest", () => {
    expect(cumulativeLevels("A1")).toEqual(["A1"]);
  });

  it("returns the whole ladder for the highest", () => {
    expect(cumulativeLevels("C1")).toEqual([...CEFR_ORDER]);
  });
});

describe("sortLevels", () => {
  it("orders a selection by CEFR rank, not alphabetically", () => {
    expect(sortLevels(["B1", "A1", "A2"])).toEqual(["A1", "A2", "B1"]);
  });

  it("does not mutate the input", () => {
    const input = ["B1", "A1"] as const;
    const copy = [...input];
    sortLevels([...input]);
    expect([...input]).toEqual(copy);
  });
});

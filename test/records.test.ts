import { describe, expect, it } from "vitest";
import { record } from "../src/records.ts";

describe("records (D37)", () => {
  it("prints a name, then each field as key=value in the order given", () => {
    expect(record("line", { id: "a->b", bends: 2, crosses: ["x", "y"] })).toBe(
      "line id=a->b bends=2 crosses=x,y",
    );
    expect(record("ok", {})).toBe("ok");
  });

  it("prints none, an empty list and an empty count as -", () => {
    expect(record("r", { a: null, b: undefined, c: [], d: {}, e: "" })).toBe(
      "r a=- b=- c=- d=- e=-",
    );
  });

  it("prints a thing and its number as id:n, and counts by name as name:n", () => {
    expect(record("counts", { busiest: { id: "api", lines: 3 } })).toBe("counts busiest=api:3");
    expect(record("box", { sides: { top: 1, bottom: 2 } })).toBe("box sides=top:1,bottom:2");
  });

  it("quotes a value with a space, a quote, an equals sign or a comma", () => {
    expect(record("r", { a: "two words", b: 'say "hi"', c: "k=v", d: ["x,y", "z"] })).toBe(
      'r a="two words" b="say \\"hi\\"" c="k=v" d="x,y",z',
    );
  });
});

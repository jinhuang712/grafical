import { describe, expect, it } from "vitest";
import { blindLabels, judgeArgs, judgePrompt, parseVerdict, shuffle } from "../../bench/judge.ts";

/** A small deterministic generator, so a test can run the same shuffle twice. */
function lcg(seed: number): (n: number) => number {
  let s = seed;
  return (n) => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s % n;
  };
}

const ids = ["grafical-haiku-r1/e1", "raw-haiku-r1/e1", "grafical-haiku-r2/e1", "raw-haiku-r2/e1"];

describe("blind labels", () => {
  it("gives every item a unique label that does not reveal it", () => {
    const { key } = blindLabels(ids, lcg(1));
    expect(Object.keys(key)).toHaveLength(ids.length);
    expect(new Set(Object.values(key))).toEqual(new Set(ids));
    for (const label of Object.keys(key)) expect(label).toMatch(/^P\d{4}$/);
  });

  it("shows the judge every label once, in a shuffled order", () => {
    const { key, order } = blindLabels(ids, lcg(2));
    expect([...order].sort()).toEqual(Object.keys(key).sort());
  });

  it("draws each judge's labels independently", () => {
    const a = blindLabels(ids, lcg(3)).key;
    const b = blindLabels(ids, lcg(4)).key;
    expect(a).not.toEqual(b);
  });

  it("is repeatable for one generator and works with the crypto RNG", () => {
    expect(blindLabels(ids, lcg(5))).toEqual(blindLabels(ids, lcg(5)));
    const c = blindLabels(ids);
    expect(new Set(Object.values(c.key))).toEqual(new Set(ids));
  });

  it("shuffle keeps every element", () => {
    expect([...shuffle([1, 2, 3, 4, 5], lcg(9))].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("parseVerdict", () => {
  const reply = {
    accuracy: 4,
    clarity: 5,
    visual: 3,
    defects: 4,
    fit: 2,
    invented: ["Cache"],
    missing: [],
    defect_list: ["label overlaps"],
    notes: "fine",
    other_changes: ["Kafka moved"],
  };

  it("reads scores and totals them", () => {
    const v = parseVerdict(JSON.stringify(reply));
    expect(v.scores).toEqual({ accuracy: 4, clarity: 5, visual: 3, defects: 4, fit: 2 });
    expect(v.total).toBe(18);
    expect(v.invented).toEqual(["Cache"]);
    expect(v.otherChanges).toEqual(["Kafka moved"]);
  });

  it("finds the object inside a code fence and prose", () => {
    const v = parseVerdict(`Here you go:\n\`\`\`json\n${JSON.stringify(reply)}\n\`\`\`\nDone.`);
    expect(v.total).toBe(18);
  });

  it("rejects a missing, non-integer or out-of-range score", () => {
    expect(() => parseVerdict("no json here")).toThrow();
    expect(() => parseVerdict(JSON.stringify({ ...reply, fit: undefined }))).toThrow(/fit/);
    expect(() => parseVerdict(JSON.stringify({ ...reply, clarity: 6 }))).toThrow(/clarity/);
    expect(() => parseVerdict(JSON.stringify({ ...reply, visual: 3.5 }))).toThrow(/visual/);
  });
});

describe("judge prompt", () => {
  it("asks the five criteria, and for a change also what else changed", () => {
    const first = judgePrompt({ brief: "BRIEF TEXT", hasBefore: false });
    expect(first).toContain("BRIEF TEXT");
    expect(first).not.toContain("other_changes");
    const change = judgePrompt({ brief: "BRIEF TEXT", request: "Rename a to b", hasBefore: true });
    expect(change).toContain("Rename a to b");
    expect(change).toContain("what changed besides the request");
    expect(change).toContain("other_changes");
    for (const c of ["accuracy", "clarity", "visual", "defects", "fit"]) expect(first).toContain(c);
    expect(first).not.toMatch(/\{\{/);
  });

  it("calls an Opus judge with JSON output and only the Read tool", () => {
    const args = judgeArgs("p");
    expect(args).toContain("--output-format");
    expect(args[args.indexOf("--output-format") + 1]).toBe("json");
    expect(args[args.indexOf("--model") + 1]).toBe("opus");
    expect(args[args.indexOf("--allowedTools") + 1]).toBe("Read");
  });
});

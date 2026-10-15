import { describe, expect, it } from "vitest";
import { draftFiles, formatSummary, type Measure, summarize } from "../../bench/diff.ts";

const one = (id: string, o: Partial<Extract<Measure, { hash: string }>> = {}): Measure => ({
  id,
  hash: "aaa",
  bends: 4,
  crossings: 1,
  width: 500,
  height: 300,
  defects: [],
  ...o,
});

describe("bench diff records", () => {
  const before = [
    one("a", { defects: ["engine:edge-overlap", "agent:overflow"] }),
    one("b"),
    { id: "c", error: "threw:x" } as Measure,
  ];
  const after = [
    one("a", { hash: "bbb", bends: 2, width: 524, defects: ["agent:overflow"] }),
    one("b"),
    one("c"),
  ];
  const lines = formatSummary(summarize("drafts", before, after));

  it("totals both engines and counts the changed ones", () => {
    expect(lines[0]).toBe(
      "corpus=drafts laid_out=2 changed=1 errors=1 bends_before=8 bends_after=6 crossings_before=2 crossings_after=2 width_before=1000 width_after=1024 height_before=600 height_after=600 defects_before=agent:overflow:1,engine:edge-overlap:1 defects_after=agent:overflow:1",
    );
  });

  it("writes one record per changed item, with signed deltas", () => {
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      "item corpus=drafts name=a bends=-2 crossings=0 width=+24 height=0 defects=engine:edge-overlap:-1",
    );
  });

  it("quotes a name that has a space", () => {
    const s = summarize("fixtures", [one("big bank")], [one("big bank", { hash: "z" })]);
    expect(s.items[0]).toContain('name="big bank"');
  });

  it("says none when no defect is left", () => {
    expect(formatSummary(summarize("fuzz", [one("s")], [one("s")]))[0]).toContain(
      "defects_before=none defects_after=none",
    );
  });
});

describe("draftFiles", () => {
  it("reads nothing from a missing folder", () => {
    expect(draftFiles("/nonexistent/runs")).toEqual([]);
  });
});

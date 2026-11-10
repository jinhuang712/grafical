import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classify,
  computeMetrics,
  graficalStats,
  offToolCommand,
  parseTranscript,
  perTurn,
  stepTotal,
} from "../../bench/metrics.ts";
import { PAGES } from "../../src/cli/help.ts";

type Usage = { in: number; cw: number; cr: number; out: number };

function assistant(id: string, usage: Usage, content: unknown[] = [{ type: "text", text: "x" }]) {
  return {
    type: "assistant",
    message: {
      id,
      content,
      usage: {
        input_tokens: usage.in,
        cache_creation_input_tokens: usage.cw,
        cache_read_input_tokens: usage.cr,
        output_tokens: usage.out,
      },
    },
  };
}

function toolUse(id: string, name: string, input: Record<string, unknown>) {
  return { type: "tool_use", id, name, input };
}

function toolResult(id: string, content: string, isError = false) {
  return {
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: id, content, is_error: isError }] },
  };
}

const jsonl = (events: unknown[]) => events.map((e) => JSON.stringify(e)).join("\n");

const result = {
  type: "result",
  subtype: "success",
  is_error: false,
  session_id: "sess-1",
  total_cost_usd: 0.25,
  duration_ms: 12_500,
  duration_api_ms: 9_000,
  num_turns: 3,
};

describe("tokens and cache hit rate", () => {
  // Turn m1 is written as two events with one message id, as a text block and a tool call.
  const events = [
    { type: "system", subtype: "init", session_id: "sess-1", model: "claude-test-1" },
    assistant("m1", { in: 10, cw: 1000, cr: 0, out: 50 }, [
      toolUse("t1", "Read", { file_path: "brief.md" }),
    ]),
    assistant("m1", { in: 10, cw: 1000, cr: 0, out: 50 }, [{ type: "text", text: "reading" }]),
    assistant("m2", { in: 5, cw: 200, cr: 1000, out: 30 }),
    assistant("m3", { in: 5, cw: 100, cr: 1200, out: 20 }),
    result,
  ];

  it("counts a message id once", () => {
    expect(perTurn(events)).toHaveLength(3);
  });

  it("computes the cache hit rate exactly, per run and per turn", () => {
    const m = computeMetrics(events, { arm: "raw", kind: "draft" });
    // uncached 10+5+5 = 20, writes 1000+200+100 = 1300, reads 0+1000+1200 = 2200
    expect(m.tokens.uncachedInput).toBe(20);
    expect(m.tokens.cacheWrite).toBe(1300);
    expect(m.tokens.cacheRead).toBe(2200);
    expect(m.tokens.output).toBe(100);
    expect(m.tokens.fresh).toBe(20 + 1300 + 100);
    expect(m.tokens.cacheHitRate).toBe(2200 / (20 + 1300 + 2200)); // 0.625
    expect(m.tokens.cacheHitRate).toBe(0.625);
    expect(m.perTurn.map((t) => t.cacheHitRate)).toEqual([0, 1000 / 1205, 1200 / 1305]);
  });

  it("takes output tokens from the result, because streamed messages undercount them", () => {
    const withUsage = [...events.slice(0, -1), { ...result, usage: { output_tokens: 10_820 } }];
    const m = computeMetrics(withUsage, { arm: "raw", kind: "draft" });
    expect(m.tokens.output).toBe(10_820);
    expect(m.tokens.fresh).toBe(20 + 1300 + 10_820);
  });

  it("reads cost, time, turns, session and model from the result", () => {
    const m = computeMetrics(events, { arm: "raw", kind: "draft" });
    expect(m).toMatchObject({
      costUsd: 0.25,
      wallSeconds: 12.5,
      apiSeconds: 9,
      turns: 3,
      sessionId: "sess-1",
      model: "claude-test-1",
      finished: true,
      isError: false,
    });
  });

  it("reports a run with no result event as unfinished", () => {
    const m = computeMetrics(events.slice(0, 3), { arm: "raw", kind: "draft" });
    expect(m.finished).toBe(false);
    expect(m.costUsd).toBe(0);
  });

  it("has a zero hit rate, not NaN, for an empty transcript", () => {
    const m = computeMetrics([], { arm: "raw", kind: "draft" });
    expect(m.tokens.cacheHitRate).toBe(0);
  });
});

describe("tool calls and image reads", () => {
  const events = [
    assistant("a", { in: 1, cw: 1, cr: 1, out: 1 }, [
      toolUse("1", "Bash", { command: "ls" }),
      toolUse("2", "Read", { file_path: "/x/diagram.png" }),
      toolUse("3", "Read", { file_path: "/x/brief.md" }),
      toolUse("4", "Read", { file_path: "/x/DIAGRAM.SVG" }),
      toolUse("5", "Write", { file_path: "/x/out.svg", content: "<svg/>" }),
      toolUse("6", "Bash", { command: "echo" }),
    ]),
    result,
  ];

  it("counts calls by tool", () => {
    const m = computeMetrics(events, { arm: "raw", kind: "draft" });
    expect(m.toolCalls).toEqual({ Bash: 2, Read: 3, Write: 1 });
    expect(m.toolCallTotal).toBe(6);
  });

  it("counts only Read calls on .png or .svg as image reads", () => {
    expect(computeMetrics(events, { arm: "raw", kind: "draft" }).imageReads).toBe(2);
  });
});

describe("grafical calls: errors, defects, denials, successes", () => {
  const call = (id: string, command: string) =>
    assistant(`m-${id}`, { in: 1, cw: 1, cr: 1, out: 1 }, [toolUse(id, "Bash", { command })]);
  const denied =
    "Permission to use Bash has been denied because Claude Code is running in don't ask mode.";

  const events = [
    call("g", "grafical -f d.grafical check --help"), // a success, but not an edit
    toolResult("g", PAGES.check?.after ?? ""), // it quotes the failure lines, with placeholders
    call("1", "grafical -f d.grafical node --set a --layer nope --label A --json"),
    toolResult(
      "1",
      '{"outcome":"REFUSED","problems":[{"kind":"ERROR","code":"unknown-layer"}]}',
      true,
    ),
    call("2", "grafical -f d.grafical node --set a --layer top --label A --json"), // retry, ok
    toolResult(
      "2",
      '{"outcome":"WRITTEN","changes":[{"action":"MADE","sort":"node","id":"a"}],"warnings":{"new":0,"cleared":[],"total":0}}',
    ),
    call("3", "grafical -f d.grafical node --set b --layer top --label B"), // a defect, as plain text
    toolResult("3", "Exit code 1\nREFUSED\n<problems>\n  DEFECT overflow\n    detail:", true),
    call("4", 'grafical -f d.grafical node --set b --layer top --label B; echo "exit $?"'), // the harness said no
    toolResult("4", denied, true),
    call("5", "grafical -f d.grafical node --set b --layer top --label B --size s"), // retry, ok
    toolResult("5", "WRITTEN\n<changes>\n  MADE node=b\n</changes>"),
    call(
      "6",
      "grafical -f d.grafical edge --set a-b --from a --to b && grafical -f d.grafical render",
    ), // one call, two commands
    toolResult("6", "WRITTEN\n<changes>\n  MADE edge=a-b\n</changes>"),
    call("7", "grafical -f d.grafical node --set c --layer top"), // an operation error, as plain text
    toolResult("7", "Exit code 1\nREFUSED\n<problems>\n  ERROR missing-field\n    detail:", true),
    call("8", "ls"), // not grafical
    toolResult("8", "d.grafical"),
  ];

  it("counts per call, in four separate groups", () => {
    const s = graficalStats(events);
    expect(s).toMatchObject({
      calls: 8, // the chained call is one call
      successes: 4,
      editSuccesses: 3,
      opErrors: 2,
      defects: 1,
      permissionDenials: 1,
    });
    expect(s.successes + s.opErrors + s.defects + s.permissionDenials).toBe(s.calls);
  });

  it("counts what the agent read before its first write", () => {
    const read = [
      call("a", "grafical --help"),
      toolResult("a", "Usage: grafical [options] [command]"),
      call("b", 'grafical "node set" --help'),
      toolResult("b", "REFUSED\n<problems>\n  ERROR unknown-command\n", true),
      call("c", "grafical node --set --help && grafical edge --set --help | head -20"),
      toolResult("c", "Usage: grafical -f <file> node --set"),
      call("d", "grafical guide flowchart; grafical -f d.grafical show"),
      toolResult("d", "OK\n<diagram>"),
      call("e", "grafical -f d.grafical nodee --set a"),
      toolResult("e", "REFUSED\n<problems>\n  ERROR unknown-command\n", true),
      call("f", "grafical -f d.grafical layer --set top --try"),
      toolResult("f", "TRIED\n<changes>\n  MADE layer=top\n</changes>"),
      call("f2", "grafical -f d.grafical diagram --set --title T"),
      toolResult("f2", "WRITTEN\n<changes>\n  MADE diagram\n</changes>"),
      call("g", "grafical node --help"),
      toolResult("g", "Usage: grafical -f <file> node"),
      call("h", "grafical guide composition"),
      toolResult("h", "Composition"),
    ];
    expect(graficalStats(read).beforeWrite).toEqual({ help: 4, guides: 1, unknownCommands: 2 });
  });

  it("counts a refused write as the first write", () => {
    const read = [
      call("a", "grafical -f d.grafical node --set a --layer nope --label A"),
      toolResult("a", "REFUSED\n<problems>\n  ERROR unknown-layer\n", true),
      call("b", "grafical node --set --help"),
      toolResult("b", "Usage: grafical -f <file> node --set"),
    ];
    expect(graficalStats(read).beforeWrite).toEqual({ help: 0, guides: 0, unknownCommands: 0 });
  });

  it("leaves denials out of the share grafical itself rejected", () => {
    expect(graficalStats(events).rejectedShare).toBe(3 / 7);
  });

  it("counts a retry when an edit succeeds right after a failure on the same diagram", () => {
    const s = graficalStats(events);
    expect(s.retries).toBe(2); // calls 2 (after an error) and 5 (after a denial)
    expect(s.recovered).toBe(3); // calls 1, 3 and 4 were followed by a success; call 7 was not
  });

  it("keeps different diagrams apart", () => {
    const other = [
      call("a", "grafical -f a.grafical node --set x --layer l --label X"),
      toolResult("a", "Exit code 1\nREFUSED\n<problems>\n  ERROR unknown-layer", true),
      call("b", "grafical -f b.grafical node --set x --layer l --label X"),
      toolResult("b", "WRITTEN\n<changes>\n  MADE node=x\n</changes>"),
    ];
    expect(graficalStats(other).retries).toBe(0);
  });

  it("classifies a result", () => {
    expect(classify(denied, true)).toBe("denied");
    expect(classify('{"outcome":"WRITTEN"}', false)).toBe("success");
    expect(classify('{"outcome":"UNCHANGED"}', false)).toBe("success");
    expect(classify("WRITTEN\n<changes>\n  MADE node=a\n</changes>", false)).toBe("success");
    expect(classify("UNCHANGED", false)).toBe("success");
    // The blocks (specs/decisions, "An answer says what happened, and a write reports only what it changed").
    expect(classify("Exit code 1\nREFUSED\n<problems>\n  ERROR unknown-node\n", true)).toBe(
      "opError",
    );
    expect(classify("Exit code 1\nREFUSED\n<problems>\n  DEFECT overflow\n", true)).toBe("defect");
    expect(
      classify(
        "WRITTEN\n<problems>\n  WARNING bent-edge\n    next: node --move\n</problems>",
        false,
      ),
    ).toBe("success");
    expect(
      classify('{"outcome":"REFUSED","problems":[{"kind":"ERROR","code":"unknown-node"}]}', true),
    ).toBe("opError");
    expect(
      classify('{"outcome":"REFUSED","problems":[{"kind":"DEFECT","code":"overflow"}]}', true),
    ).toBe("defect");
    expect(
      classify('{"outcome":"WRITTEN","problems":[{"kind":"WARNING","code":"bent-edge"}]}', false),
    ).toBe("success");
    // The help quotes the blocks with placeholders: they are not refusals.
    expect(classify("ERROR|DEFECT|WARNING <code>\nERROR: nothing could be applied", false)).toBe(
      "success",
    );
    expect(classify("boom", true)).toBe("opError");
  });

  it("is null for the raw arm and set for the grafical arm", () => {
    expect(computeMetrics(events, { arm: "raw", kind: "draft" }).grafical).toBeNull();
    expect(computeMetrics(events, { arm: "grafical", kind: "draft" }).grafical?.calls).toBe(8);
  });
});

describe("off-tool drawing (hypothesis H4)", () => {
  it("never counts a grafical call", () => {
    expect(offToolCommand("grafical -f d.grafical render --png diagram.png")).toBe(false);
    expect(
      offToolCommand(
        "grafical -f d.grafical node --add a --layer l --label A && grafical -f d.grafical check",
      ),
    ).toBe(false);
  });

  it("counts writing a picture, a drawing program, a drawing script and coordinates", () => {
    expect(offToolCommand("cat > out.svg <<'EOF'")).toBe(true);
    expect(offToolCommand("echo hi > chart.png")).toBe(true);
    expect(offToolCommand("python3 draw.py")).toBe(true);
    expect(offToolCommand("python3 -c 'import matplotlib'")).toBe(true);
    expect(offToolCommand("dot -Tpng g.dot -o diagram.png")).toBe(true);
    expect(offToolCommand('echo \'<rect x="10" y="20"/>\'')).toBe(true);
  });

  it("leaves reading, plain shell and an interpreter that edits a file alone", () => {
    expect(offToolCommand("cat brief.md; ls; echo done")).toBe(false);
    expect(offToolCommand("cat > /tmp/notes.md <<'EOF'")).toBe(false);
    expect(offToolCommand("python3 -c 'import json; fix(\"notes.json\")'")).toBe(false);
    expect(offToolCommand("cat d.grafical | node -e 'x'")).toBe(false);
  });

  it("allows the Mermaid arm its own tool, and nothing else", () => {
    expect(offToolCommand("mmdc -i diagram.mmd -o diagram.png", "mmdc")).toBe(false);
    expect(offToolCommand("mmdc -i diagram.mmd -o diagram.png")).toBe(true);
    expect(offToolCommand("cat > diagram.svg <<'EOF'", "mmdc")).toBe(true);
  });

  it("counts per step, in the grafical and Mermaid arms only", () => {
    const events = [
      assistant("a", { in: 1, cw: 1, cr: 1, out: 1 }, [
        toolUse("1", "Bash", { command: "grafical -f d.grafical render" }),
        toolUse("2", "Bash", { command: "python3 -c 'print(1)'" }),
        toolUse("3", "Bash", { command: "cat > a.svg <<'EOF'" }),
      ]),
      result,
    ];
    expect(computeMetrics(events, { arm: "grafical", kind: "draft" }).offTool).toBe(1);
    // The SVG written by hand counts in both; neither interpreter call names a picture.
    expect(computeMetrics(events, { arm: "mermaid", kind: "draft" }).offTool).toBe(1);
    expect(computeMetrics(events, { arm: "raw", kind: "draft" }).offTool).toBeNull();
  });
});

/** The real chain: Haiku with grafical on the fictional catalog-sync brief, trimmed to what the metrics read. */
describe("a real measured chain (fixtures)", () => {
  const STEPS = ["e1", "e2-add-node", "e2-move-node", "e2-rename-node", "e2-remove-node"];
  const load = (step: string) =>
    parseTranscript(
      readFileSync(join(import.meta.dirname, "fixtures", "measure", `${step}.jsonl`), "utf8"),
    );

  it("sums per-step costs to the session total", () => {
    let previous: { costUsd: number; apiSeconds: number } | undefined;
    const costs: number[] = [];
    const wall: number[] = [];
    const sessions: number[] = [];
    for (const step of STEPS) {
      const m = computeMetrics(load(step), {
        arm: "grafical",
        kind: step === "e1" ? "draft" : "change",
        ...(previous ? { previous } : {}),
      });
      previous = { costUsd: m.sessionCostUsd, apiSeconds: m.sessionApiSeconds };
      costs.push(m.costUsd);
      wall.push(m.wallSeconds);
      sessions.push(m.sessionCostUsd);
    }
    // The running totals the harness recorded before the fix.
    expect(sessions.map((c) => c.toFixed(4))).toEqual([
      "0.0309",
      "0.0360",
      "0.0375",
      "0.0388",
      "0.0402",
    ]);
    // The steps after the first cost the differences: $0.0051, $0.0015, $0.0013, $0.0014.
    expect(costs.slice(1).map((c) => c.toFixed(4))).toEqual([
      "0.0051",
      "0.0015",
      "0.0014",
      "0.0014",
    ]);
    expect(costs.reduce((a, b) => a + b, 0)).toBeCloseTo(0.04021620000000001, 10);
    // Wall time was already per call.
    expect(wall.map((w) => Math.round(w))).toEqual([114, 14, 4, 6, 4]);
  });
});

describe("a step's share of a session total", () => {
  it("is the difference, and the whole total for a first step or a new session", () => {
    expect(stepTotal(0.036, 0.0309)).toBeCloseTo(0.0051, 10);
    expect(stepTotal(0.0309, undefined)).toBe(0.0309);
    expect(stepTotal(0.01, 0.0309)).toBe(0.01);
  });

  it("records both the step's cost and the session's", () => {
    const m = computeMetrics([result], {
      arm: "raw",
      kind: "change",
      previous: { costUsd: 0.2, apiSeconds: 4 },
    });
    expect(m.costUsd).toBeCloseTo(0.05, 10);
    expect(m.sessionCostUsd).toBe(0.25);
    expect(m.apiSeconds).toBe(5);
    expect(m.sessionApiSeconds).toBe(9);
  });
});

describe("regenerations", () => {
  const bash = (command: string) =>
    assistant("m", { in: 1, cw: 1, cr: 1, out: 1 }, [toolUse("1", "Bash", { command })]);
  const write = (file: string) =>
    assistant("m", { in: 1, cw: 1, cr: 1, out: 1 }, [
      toolUse("1", "Write", { file_path: file, content: "" }),
    ]);
  const edit = assistant("m", { in: 1, cw: 1, cr: 1, out: 1 }, [
    toolUse("1", "Edit", { file_path: "diagram.svg", old_string: "a", new_string: "b" }),
  ]);

  it("is zero for a draft", () => {
    expect(
      computeMetrics([write("diagram.svg")], { arm: "raw", kind: "draft" }).regenerations,
    ).toBe(0);
  });

  it("counts a change step that removes the diagram file to make it again", () => {
    expect(
      computeMetrics([bash("rm d.grafical && grafical -f d.grafical diagram --set --title T")], {
        arm: "grafical",
        kind: "change",
      }).regenerations,
    ).toBe(1);
    expect(
      computeMetrics([bash("grafical -f d.grafical node --set a --label B")], {
        arm: "grafical",
        kind: "change",
      }).regenerations,
    ).toBe(0);
  });

  it("counts a rewritten diagram source for the raw arm, but not an edit", () => {
    expect(
      computeMetrics([write("diagram.svg")], { arm: "raw", kind: "change" }).regenerations,
    ).toBe(1);
    expect(computeMetrics([edit], { arm: "raw", kind: "change" }).regenerations).toBe(0);
  });
});

describe("parseTranscript", () => {
  it("skips blank and cut-off lines", () => {
    const text = `${jsonl([{ type: "system" }])}\n\n{"type":"assis`;
    expect(parseTranscript(text)).toEqual([{ type: "system" }]);
  });
});

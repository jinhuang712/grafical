import { describe, expect, it } from "vitest";
import { computeMetrics, graficalStats, parseTranscript, perTurn } from "../../bench/metrics.ts";

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

describe("grafical operation errors and retries", () => {
  const call = (id: string, command: string) =>
    assistant(`m-${id}`, { in: 1, cw: 1, cr: 1, out: 1 }, [toolUse(id, "Bash", { command })]);

  const events = [
    call("g", "grafical guide"), // not a write
    toolResult("g", "the guide"),
    call("1", "grafical new d.yaml --title T --json"),
    toolResult("1", '{"ok":true,"errors":[],"defects":[]}'),
    call("2", "grafical node add d.yaml a --layer nope --label A --json"),
    toolResult("2", '{"ok":false,"errors":[{"code":"unknown-layer","index":0}]}', true),
    call("3", "grafical node add d.yaml a --layer top --label A --json"), // retry, ok
    toolResult("3", '{"ok":true,"errors":[]}'),
    call("4", "grafical node add d.yaml b --layer top --label B"), // no --json, exit 1
    toolResult("4", "error: overflow", true),
    call("5", "grafical node add d.yaml b --layer top --label B --size l"), // retry, rejected again
    toolResult("5", '{"errors":[],"defects":[{"code":"overflow"}]}'),
    call("6", "grafical render d.yaml --png diagram.png && grafical show d.yaml"), // not writes
    toolResult("6", "ok"),
    call("7", "grafical node add d.yaml b --layer top --label B --size s"), // retry, ok
    toolResult("7", '{"ok":true}'),
  ];

  it("counts writes, rejections, retries and recoveries", () => {
    const s = graficalStats(events);
    expect(s.writes).toBe(6);
    expect(s.rejected).toBe(3);
    expect(s.rejectedShare).toBe(0.5);
    expect(s.retries).toBe(3); // calls 3, 5 and 7 each follow a rejected write
    expect(s.recovered).toBe(3);
  });

  it("is null for the raw arm and set for the grafical arm", () => {
    expect(computeMetrics(events, { arm: "raw", kind: "draft" }).grafical).toBeNull();
    expect(computeMetrics(events, { arm: "grafical", kind: "draft" }).grafical?.writes).toBe(6);
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

  it("counts a grafical new in a change step", () => {
    expect(
      computeMetrics([bash("grafical new d.yaml --title T")], { arm: "grafical", kind: "change" })
        .regenerations,
    ).toBe(1);
    expect(
      computeMetrics([bash("grafical node rename d.yaml a --label B")], {
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

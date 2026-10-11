import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runWrite } from "../../src/cli/pipeline.ts";
import {
  changedParts,
  describeOp,
  type Frame,
  startViewer,
  type ViewEvent,
  windowSize,
} from "../../src/cli/view.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps } from "../../src/model/apply.ts";
import { writeDiagram } from "../../src/model/io.ts";
import type { Diagram } from "../../src/model/types.ts";
import { createMeasurer, type Measurer } from "../../src/text/index.ts";
import { tiny } from "../fixtures/tiny.ts";

vi.setConfig({ testTimeout: 30_000 });

let m: Measurer;
let dir: string;
beforeAll(async () => {
  m = await createMeasurer();
  dir = mkdtempSync(join(tmpdir(), "grafical-view-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function edited(d: Diagram, ...ops: Parameters<typeof applyOps>[1]): Diagram {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

describe("changedParts", () => {
  it("marks nothing on the first picture or when nothing changed", () => {
    const scene = layout(tiny, m);
    expect(changedParts(undefined, scene)).toEqual([]);
    expect(changedParts(scene, layout(tiny, m))).toEqual([]);
  });

  it("marks a renamed node and nothing else", () => {
    const after = layout(edited(tiny, { op: "node.rename", id: "api", label: "orders-svc" }), m);
    const api = after.nodes.find((n) => n.id === "api");
    expect(changedParts(layout(tiny, m), after)).toEqual([api?.rect]);
  });

  it("marks a new node but not the nodes it pushed aside", () => {
    const before = layout(tiny, m);
    const after = layout(
      edited(tiny, { op: "node.add", id: "cache", layer: "services", label: "cache" }),
      m,
    );
    const moved = after.nodes.filter((n) => {
      const was = before.nodes.find((b) => b.id === n.id);
      return was !== undefined && (was.rect.x !== n.rect.x || was.rect.y !== n.rect.y);
    });
    expect(moved.length).toBeGreaterThan(0);
    const cache = after.nodes.find((n) => n.id === "cache");
    expect(changedParts(before, after)).toEqual([cache?.rect]);
  });

  it("marks a new edge with a box around its route", () => {
    const after = layout(edited(tiny, { op: "edge.add", from: "web", to: "worker" }), m);
    const marks = changedParts(layout(tiny, m), after);
    const route = after.edges.find((e) => e.from === "web" && e.to === "worker")?.points ?? [];
    expect(marks).toHaveLength(1);
    for (const p of route) {
      expect(p.x).toBeGreaterThan(marks[0]?.x ?? Infinity);
      expect(p.y).toBeGreaterThan(marks[0]?.y ?? Infinity);
    }
  });
});

/** Reads the viewer's event stream one frame at a time. */
async function frames(url: string) {
  const ac = new AbortController();
  const res = await fetch(`${url}events`, { signal: ac.signal });
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  return {
    async next(): Promise<Frame> {
      while (!buffer.includes("\n\n")) {
        const { value, done } = await reader.read();
        if (done) throw new Error("the stream ended");
        buffer += decoder.decode(value, { stream: true });
      }
      const at = buffer.indexOf("\n\n");
      const message = buffer.slice(0, at);
      buffer = buffer.slice(at + 2);
      return JSON.parse(message.slice("data: ".length)) as Frame;
    },
    close: () => ac.abort(),
  };
}

describe("the list of changes and the window", () => {
  it("describes operations in a few words", () => {
    expect(
      describeOp({
        op: "node.add",
        id: "search",
        layer: "services",
        label: "search-api",
        kind: "service",
        after: "bff",
      }),
    ).toBe('node add search "search-api" in services');
    expect(
      describeOp({ op: "edge.add", from: "bff", to: "search", label: "query", kind: "call" }),
    ).toBe('edge add bff → search "query"');
    expect(describeOp({ op: "lane.join", lane: "webteam", members: ["search"] })).toBe(
      "lane join webteam search",
    );
    expect(describeOp({ op: "diagram.style", style: "dark" })).toBe("diagram style dark");
    expect(describeOp({ op: "node.emphasize", id: "payments", off: true })).toBe(
      "node emphasize payments off",
    );
  });

  it("sizes the window to the picture, within a small laptop screen", () => {
    expect(windowSize()).toEqual({ width: 1200, height: 860 });
    expect(windowSize({ width: 776, height: 440 })).toEqual({ width: 1108, height: 541 });
    const huge = windowSize({ width: 3000, height: 1600 });
    expect(huge.width).toBeLessThanOrEqual(1440);
    expect(huge.height).toBeLessThanOrEqual(900);
    expect(windowSize({ width: 200, height: 100 })).toEqual({ width: 760, height: 520 });
  });
});

describe("startViewer", () => {
  it("serves the page and pushes a new picture when the file or its stylesheet changes", async () => {
    const file = join(dir, "live.grafical.yaml");
    writeFileSync(file, writeDiagram(tiny));
    const viewer = await startViewer(file, 0);
    const stream = await frames(viewer.url);
    try {
      const page = await (await fetch(viewer.url)).text();
      expect(page).toContain("<title>live.grafical.yaml · grafical</title>");

      const first = await stream.next();
      expect(first.svg).toContain("orders-api");
      expect(first.changed).toEqual([]);
      expect(first.stale).toBe(false);
      const history = (first as Frame & { history: ViewEvent[] }).history;
      expect(history.map((e) => e.kind)).toEqual(["open"]);
      expect(history[0]?.lines[0]).toBe("live.grafical.yaml: 5 boxes, 5 arrows");

      // An edit by another process, the way an agent makes it.
      expect(
        (await runWrite(file, [{ op: "node.rename", id: "api", label: "orders-svc" }])).ok,
      ).toBe(true);
      const renamed = await stream.next();
      expect(renamed.svg).toContain("orders-svc");
      expect(renamed.changed).toHaveLength(1);
      expect(renamed.event).toMatchObject({
        kind: "change",
        lines: ['node rename api "orders-svc"'],
      });

      // A broken file keeps the last good picture and says why.
      writeFileSync(file, "grafical: 1\nlayers: [");
      const broken = await stream.next();
      expect(broken.stale).toBe(true);
      expect(broken.svg).toBe(renamed.svg);
      expect(broken.problems.join("\n")).toMatch(/error/);
      expect(broken.event?.kind).toBe("error");

      // A change to the stylesheet alone redraws the picture.
      const sheet = join(dir, "house.grafical-style.yaml");
      writeFileSync(sheet, 'grafical-style: 1\npaint:\n  background: "#fafafa"\n');
      writeFileSync(file, writeDiagram({ ...tiny, style: "house.grafical-style.yaml" }));
      const styled = await stream.next();
      expect(styled.stale).toBe(false);
      expect(styled.svg).toContain("#fafafa");
      writeFileSync(sheet, 'grafical-style: 1\npaint:\n  background: "#f0f0e8"\n');
      const restyled = await stream.next();
      expect(restyled.svg).toContain("#f0f0e8");
      expect(restyled.event?.lines).toEqual(["the stylesheet changed"]);
    } finally {
      stream.close();
      await viewer.close();
    }
  });

  it("opens before the file exists and draws it once it is written", async () => {
    const file = join(dir, "later.grafical.yaml");
    const viewer = await startViewer(file, 0);
    const stream = await frames(viewer.url);
    try {
      const waiting = await stream.next();
      expect(waiting.svg).toBe("");
      expect(waiting.stale).toBe(true);
      expect(waiting.problems.join("\n")).toContain("file-not-found");
      expect((await runWrite(file, [{ op: "diagram.new", title: "Later" }], true)).ok).toBe(true);
      const drawn = await stream.next();
      expect(drawn.stale).toBe(false);
      expect(drawn.svg).toContain("Later");
    } finally {
      stream.close();
      await viewer.close();
    }
  });

  it("answers 404 for anything but the page, the events and the fonts", async () => {
    const file = join(dir, "other.grafical.yaml");
    writeFileSync(file, writeDiagram(tiny));
    const viewer = await startViewer(file, 0);
    try {
      expect((await fetch(`${viewer.url}nope`)).status).toBe(404);
      expect((await fetch(`${viewer.url}fonts/nope`)).status).toBe(404);
      expect((await fetch(`${viewer.url}fonts/inter-400`)).status).toBe(200);
    } finally {
      await viewer.close();
    }
  });
});

import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { check as checker } from "../../src/check/index.ts";
import {
  chooseSlot,
  layout,
  layoutFramed,
  lineTrouble,
  routeStats,
  validateAlignments,
  validateGroups,
} from "../../src/layout/index.ts";
import type { Diagram, DiagramNode, Edge } from "../../src/model/types.ts";
import type { Point, Rect, Scene, SceneEdge } from "../../src/scene.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { createStubMeasurer } from "../../src/text/stub.ts";
import type { Measurer } from "../../src/text/types.ts";
import { e, n } from "../fixtures/build.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { dense } from "../fixtures/dense.ts";
import { edgeCases } from "../fixtures/edge-cases.ts";
import { nested } from "../fixtures/nested.ts";
import { tiny } from "../fixtures/tiny.ts";
import { defects, groupIntruders, mechanical, taste, textCrossings } from "./checks.ts";
import {
  type Applied,
  addEdge,
  addNode,
  moveNode,
  randomEdges,
  removeEdge,
  removeNode,
  renameNode,
} from "./ops.ts";
import { d10 } from "./stability.ts";

const m = createStubMeasurer();
const fixtures: [string, Diagram][] = [
  ["tiny", tiny],
  ["edge-cases", edgeCases],
  ["catalog-sync-grouped", catalogSyncGrouped],
  ["catalog-sync", catalogSync],
  ["dense", dense],
  ["nested", nested],
];
const crossings = (d: Diagram) => routeStats(layout(d, m).edges.map((x) => x.points)).crossings;
const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
/** Every defect the engine owns, from the layout's own checks. */
const engineOwned = (s: Scene) => [
  ...mechanical(defects(s)).filter((x) => !x.startsWith("overflow")),
  ...textCrossings(s).map((x) => `text crossing: ${x}`),
  ...groupIntruders(s).map((x) => `group intruder: ${x}`),
];

describe("no mechanical defects", () => {
  for (const [name, d] of fixtures) {
    it(name, () => {
      const scene = layout(d, m);
      expect(scene.nodes).toHaveLength(d.layers.reduce((s, l) => s + l.nodes.length, 0));
      expect(scene.edges).toHaveLength(d.edges.length);
      expect(engineOwned(scene)).toEqual([]);
      expect(validateAlignments(d)).toEqual([]);
      expect(validateGroups(d)).toEqual([]);
    });
  }

  it("route measures", () => {
    for (const [name, d] of fixtures) {
      const st = routeStats(layout(d, m).edges.map((x) => x.points));
      console.log(`${name}: crossings ${st.crossings}, bends ${st.bends}, length ${st.length} px`);
    }
    // The phase 0 spike: 68 crossings on catalog-sync, libavoid-js 40.
    expect(crossings(catalogSync)).toBeLessThan(40);
  });
});

describe("with the real measurer", () => {
  let real: Measurer;
  beforeAll(async () => {
    real = await createMeasurer();
  });
  for (const [name, d] of fixtures) {
    it(`${name} has no defect at all`, () => {
      const scene = layout(d, real);
      expect(checker(d, scene, real).map((x) => `${x.code} ${x.found}`)).toEqual([]);
      expect([...mechanical(defects(scene)), ...engineOwned(scene)]).toEqual([]);
    });
  }
});

/** Points where lines of one fan-out leave in all four directions: a junction that reads as a crossing. */
function crossLikeJunctions(edges: SceneEdge[]): string[] {
  const out: string[] = [];
  const buses = new Map<string, SceneEdge[]>();
  for (const x of edges) {
    if (x.label !== undefined) continue;
    const key = `${x.from}:${x.kind}`;
    buses.set(key, [...(buses.get(key) ?? []), x]);
  }
  for (const [key, members] of buses) {
    if (members.length < 2) continue;
    const dirs = new Map<string, Set<string>>();
    const at = (p: Point) => `${p.x},${p.y}`;
    const add = (p: Point, d: string) => dirs.set(at(p), (dirs.get(at(p)) ?? new Set()).add(d));
    const corners = members.flatMap((x) => x.points);
    for (const x of members) {
      for (let i = 1; i < x.points.length; i++) {
        const a = x.points[i - 1] as Point;
        const b = x.points[i] as Point;
        for (const p of corners) {
          const onV = a.x === b.x && p.x === a.x;
          const onH = a.y === b.y && p.y === a.y;
          const lo = onV ? Math.min(a.y, b.y) : Math.min(a.x, b.x);
          const hi = onV ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
          const t = onV ? p.y : p.x;
          if (!(onV || onH) || t < lo || t > hi) continue;
          if (t > lo) add(p, onV ? "up" : "left");
          if (t < hi) add(p, onV ? "down" : "right");
        }
      }
    }
    for (const [p, set] of dirs) if (set.size === 4) out.push(`${key} at ${p}`);
  }
  return out;
}

describe("groups inside groups (D34)", () => {
  let scene: Scene;
  beforeAll(async () => {
    scene = layout(nested, await createMeasurer());
  });
  const box = (id: string) => scene.groups?.find((g) => g.id === id);

  it("draws each inner box inside its outer one, a padding clear of each side", () => {
    for (const [inner, outer] of [
      ["vpc", "region"],
      ["public", "vpc"],
      ["private", "vpc"],
    ] as const) {
      const a = box(inner)?.rect as Rect;
      const b = box(outer)?.rect as Rect;
      expect(a.x - b.x).toBeGreaterThanOrEqual(24);
      expect(b.x + b.w - (a.x + a.w)).toBeGreaterThanOrEqual(24);
      expect(a.y - b.y).toBeGreaterThanOrEqual(40);
      expect(b.y + b.h - (a.y + a.h)).toBeGreaterThanOrEqual(24);
    }
    expect(scene.groups?.map((g) => [g.id, g.depth ?? 1])).toEqual([
      ["region", 1],
      ["vpc", 2],
      ["public", 3],
      ["private", 3],
    ]);
  });

  it("draws no box for an empty group inside another, and leaves the outer box as it was", async () => {
    const empty = {
      ...nested,
      groups: [...(nested.groups ?? []), { id: "zone", label: "zone b", in: "region" }],
    };
    const drawn = layout(empty, await createMeasurer());
    expect(drawn.groups?.map((g) => g.id)).toEqual(["region", "vpc", "public", "private"]);
    expect(drawn.groups?.[0]?.rect).toEqual(box("region")?.rect);
  });

  it("counts an inner group's nodes as the outer one's, and lets no other node in", () => {
    expect(box("region")?.members).toEqual([
      "lb",
      "servers",
      "api",
      "worker",
      "db",
      "queue",
      "backup",
    ]);
    expect(groupIntruders(scene)).toEqual([]);
    expect(textCrossings(scene)).toEqual([]);
  });
});

describe("lines past a group they do not belong to", () => {
  it("run outside its box, not in its margin or along its border", async () => {
    const d: Diagram = {
      grafical: 1,
      title: "Past a group",
      density: "normal",
      layers: [
        { id: "top", label: "Top", nodes: [n("callers", "callers", "actor", "m")] },
        {
          id: "mid",
          label: "Middle",
          nodes: [
            n("a", "relay", "service", "m", { group: "g" }),
            n("b", "worker", "service", "m", { group: "g" }),
          ],
        },
        {
          id: "low",
          label: "Low",
          nodes: [n("store", "store", "store", "m"), n("db", "database", "store", "m")],
        },
      ],
      groups: [{ id: "g", label: "pipeline" }],
      edges: [e("a", "b", "call"), e("b", "store", "data"), e("callers", "db", "call")],
    };
    const scene = layout(d, await createMeasurer());
    const box = scene.groups?.[0]?.rect as Rect;
    const line = scene.edges.find((x) => x.id === "callers->db")?.points ?? [];
    const down = line.flatMap((p, i) => {
      const q = line[i + 1];
      return q !== undefined &&
        p.x === q.x &&
        Math.min(p.y, q.y) < box.y + box.h &&
        Math.max(p.y, q.y) > box.y
        ? [p.x]
        : [];
    });
    expect(down.length).toBeGreaterThan(0);
    for (const x of down) expect(x < box.x - 4 || x > box.x + box.w + 4).toBe(true);
  });
});

describe("the target look (D25)", () => {
  let scene: Scene;
  let m: Measurer;
  beforeAll(async () => {
    m = await createMeasurer();
    scene = layout(catalogSyncGrouped, m);
  });
  const edge = (id: string) => scene.edges.find((x) => x.id === id) as SceneEdge;
  const node = (id: string) => scene.nodes.find((x) => x.id === id)?.rect;

  it("meets the measured rules", () => {
    const t = taste(scene);
    console.log("catalog-sync-grouped:", JSON.stringify(t));
    expect(t.width).toBeLessThanOrEqual(1024);
    expect(t.straight).toBeGreaterThanOrEqual(0.5);
    expect(t.maxBends).toBeLessThanOrEqual(2);
    expect(t.crossings).toBeLessThanOrEqual(Math.floor(scene.edges.length / 10));
    expect(t.corridorViolations).toBe(0);
  });

  it("puts every node on one grid of five columns", () => {
    const centres = new Set(scene.nodes.map((x) => x.rect.x + x.rect.w / 2));
    expect(centres.size).toBe(5);
    // The chain from the upstream topics to the replicas is one straight line.
    for (const id of ["upstream->relay", "relay->line_topics", "line_topics->pipelines"]) {
      expect(edge(id).points).toHaveLength(2);
    }
  });

  it("lets an edge to a node wholly to one side leave from that side, with one bend", () => {
    // retry sits up and to the left of pipelines and geo down and to the left, with
    // nothing between in the row; one of the two takes the left side.
    const from = node("pipelines") as Rect;
    const mid = { x: from.x, y: from.y + from.h / 2 };
    const out = scene.edges.filter(
      (x) => x.from === "pipelines" && x.points[0]?.x === mid.x && x.points[0]?.y === mid.y,
    );
    expect(out.map((x) => x.id)).toHaveLength(1);
    const [only] = out;
    if (only === undefined) throw new Error("no side exit");
    const to = node(only.to) as Rect;
    const pts = only.points;
    expect(pts).toHaveLength(3);
    expect(pts[1]?.y).toBe(mid.y);
    expect(pts[2]).toEqual({ x: pts[1]?.x, y: to.y > mid.y ? to.y : to.y + to.h });
  });

  it("runs edges between neighbours straight sideways, with their labels", () => {
    for (const id of ["pipelines->mongo", "service->mongo", "retry->line_topics"]) {
      const pts = edge(id).points;
      expect(pts).toHaveLength(2);
      expect(pts[0]?.y).toBe(pts[1]?.y);
    }
    expect(
      edge("pipelines->mongo")
        .label?.runs.map((r) => r.text)
        .join(""),
    ).toBe("persist");
  });

  it("bundles a fan-out of three or more unlabelled lines into one port and trunk (D38)", () => {
    const crossings = lineTrouble(catalogSyncGrouped, m).crossings;
    for (const from of ["pipelines", "service"]) {
      const out = scene.edges.filter(
        (x) => x.from === from && x.label === undefined && x.kind === "call",
      );
      expect(out.length).toBeGreaterThanOrEqual(3);
      expect(new Set(out.map((x) => `${x.points[0]?.x},${x.points[0]?.y}`)).size).toBe(1);
      const ids = new Set(out.map((x) => x.id));
      expect(crossings.filter(([a, b]) => ids.has(a) && ids.has(b))).toEqual([]);
    }
  });

  it("gives each line a port of its own when two leave a side with room (D33)", () => {
    const two: Diagram = {
      grafical: 1,
      title: "Two",
      density: "normal",
      layers: [
        { id: "top", label: "Top", nodes: [n("a", "A service", "service", "m")] },
        { id: "low", label: "Low", nodes: [n("b", "B", "store", "m"), n("c", "C", "store", "m")] },
      ],
      edges: [e("a", "b", "call"), e("a", "c", "call")],
    };
    const out = layout(two, m).edges;
    expect(new Set(out.map((x) => `${x.points[0]?.x},${x.points[0]?.y}`)).size).toBe(2);
  });

  it("merges a crowded side's fan-out into one trunk, with no junction that reads as a crossing", () => {
    const crowded = layout(dense, m);
    const out = crowded.edges.filter(
      (x) => x.from === "goods_pipe" && x.kind === "data" && x.label === undefined,
    );
    expect(out.length).toBeGreaterThan(8);
    expect(new Set(out.map((x) => `${x.points[0]?.x},${x.points[0]?.y}`)).size).toBe(1);
    expect(crossLikeJunctions(crowded.edges)).toEqual([]);
  });

  it("draws each group as one box around its members, its label clear of lines", () => {
    expect(scene.groups?.map((g) => [g.id, g.members.length])).toEqual([
      ["catalog-sync", 5],
      ["catalog-api", 2],
    ]);
    expect(groupIntruders(scene)).toEqual([]);
    expect(textCrossings(scene)).toEqual([]);
    for (const g of scene.groups ?? []) {
      for (const id of g.members) {
        const r = node(id);
        if (r === undefined) throw new Error(id);
        expect(r.x).toBeGreaterThanOrEqual(g.rect.x + 24);
        expect(r.x + r.w).toBeLessThanOrEqual(g.rect.x + g.rect.w - 24);
      }
    }
  });

  it("has a subtitle, a footnote and a legend of the two line styles", () => {
    expect(scene.subtitle?.runs.length).toBeGreaterThan(0);
    expect(scene.note?.runs.length).toBeGreaterThan(0);
    expect(scene.legend?.map((x) => x.style)).toEqual(["solid", "dashed"]);
    const legendRight = Math.max(
      ...(scene.legend ?? []).map((x) => x.label.bbox.x + x.label.bbox.w),
    );
    expect(legendRight).toBeLessThanOrEqual(scene.width - 32);
  });
});

describe("edge cases", () => {
  const base: Diagram = {
    grafical: 1,
    title: "Edge cases",
    density: "normal",
    layers: [
      {
        id: "a",
        label: "A",
        nodes: [n("a1", "a1", "service", "m"), n("a2", "a2", "service", "s")],
      },
      {
        id: "b",
        label: "B",
        nodes: [
          n("b1", "b1", "service", "m"),
          n("b2", "b2", "service", "m"),
          n("b3", "b3", "store", "l"),
        ],
      },
      { id: "c", label: "C", nodes: [n("c1", "c1", "queue", "m")] },
    ],
    edges: [],
  };
  const cases: [string, Edge[]][] = [
    ["a self-loop", [e("b2", "b2", "call", "retry")]],
    [
      "two edges between one pair",
      [e("a1", "b1", "call", "read"), { ...e("a1", "b1", "data", "write"), id: "a1->b1#2" }],
    ],
    [
      "edges both ways between one pair",
      [e("a1", "b2", "call", "ask"), e("b2", "a1", "async", "answer")],
    ],
    ["an edge between neighbours", [e("b1", "b2", "call")]],
    ["a labelled edge between neighbours", [e("b1", "b2", "call", "notify")]],
    ["an edge within a layer, past a neighbour", [e("b1", "b3", "data", "copy")]],
    ["an edge that skips a layer", [e("a1", "c1", "async", "publish"), e("c1", "a2", "async")]],
    ["the left-most gap", [e("a1", "c1", "call"), e("a2", "c1", "call"), e("b1", "c1", "call")]],
    [
      "many ends on one side",
      ["b1", "b2", "b3", "c1", "a2"].flatMap((t, i) => [
        e("a1", t, i % 2 ? "async" : "call", `e${i}`),
      ]),
    ],
    ["a fan-out bus", ["b1", "b2", "b3", "c1"].map((t) => e("a2", t, "data"))],
  ];
  for (const [name, edges] of cases) {
    it(name, () => {
      const d = { ...base, edges };
      const scene = layout(d, m);
      expect(scene.edges).toHaveLength(edges.length);
      for (const x of scene.edges) expect(x.points.length).toBeGreaterThanOrEqual(2);
      expect(mechanical(defects(scene))).toEqual([]);
    });
  }

  it("draws a self-loop wide and deep enough to read as a loop (D33)", () => {
    const loop = layout(edgeCases, m).edges.find((x) => x.from === x.to);
    const [a, b, c, d] = loop?.points ?? [];
    expect(loop?.points).toHaveLength(4);
    expect(Math.abs((c?.x ?? 0) - (b?.x ?? 0))).toBe(48);
    expect((b?.y ?? 0) - (a?.y ?? 0)).toBeGreaterThanOrEqual(28);
    expect(d?.y).toBe(a?.y);
  });

  it("an empty layer that an edge passes through", () => {
    const d: Diagram = {
      ...base,
      layers: [base.layers[0], { id: "empty", label: "Empty", nodes: [] }, base.layers[2]].filter(
        (l) => l !== undefined,
      ),
      edges: [e("a1", "c1", "call", "through")],
    };
    expect(mechanical(defects(layout(d, m)))).toEqual([]);
  });

  it("a diagram without layers", () => {
    const scene = layout({ ...base, layers: [], edges: [] }, m);
    expect(scene.nodes).toEqual([]);
    expect(scene.width).toBeGreaterThan(0);
  });

  it("an edge to a node that does not exist is left out", () => {
    const scene = layout({ ...base, edges: [e("a1", "nope", "call")] }, m);
    expect(scene.edges).toEqual([]);
  });
});

describe("stability (D10)", () => {
  let ops = 0;
  let moved = 0;
  let routes = 0;
  const check = (before: Diagram, op: Applied) => {
    const r = d10(
      layoutFramed(before, m),
      layoutFramed(op.diagram, m),
      before,
      op.diagram,
      op.named,
    );
    ops++;
    moved += r.moved.length;
    routes += r.changedRoutes.length;
    return r.violations;
  };
  afterAll(() => {
    console.log(
      `${ops} single operations: ${(moved / ops).toFixed(1)} unnamed nodes and ${(routes / ops).toFixed(1)} routes moved per operation`,
    );
  });

  for (const [name, d] of [
    ["catalog-sync", catalogSync],
    ["catalog-sync-grouped", catalogSyncGrouped],
    ["nested", nested],
  ] as const) {
    const nodes = d.layers.flatMap((l) => l.nodes.map((x) => ({ node: x, layer: l.id })));

    it(`${name}: add a node to each layer`, () => {
      const out = d.layers.flatMap((l) =>
        check(d, addNode(d, l.id, n(`new_${l.id}`, "new node", "service", "m"), m)).map(
          (v) => `${l.id}: ${v}`,
        ),
      );
      expect(out).toEqual([]);
    });

    it(`${name}: remove each node`, () => {
      const out = nodes.flatMap(({ node }) =>
        check(d, removeNode(d, node.id)).map((v) => `${node.id}: ${v}`),
      );
      expect(out).toEqual([]);
    });

    it(`${name}: rename each node, which moves nothing`, () => {
      for (const { node } of nodes) {
        const op = renameNode(d, node.id, `${node.label} v2`);
        const before = layout(d, m);
        const after = layout(op.diagram, m);
        expect(check(d, op)).toEqual([]);
        const strip = (s: typeof before) => ({
          ...s,
          nodes: s.nodes.map((x) => ({ ...x, texts: x.id === node.id ? [] : x.texts })),
        });
        expect(hash(strip(after))).toEqual(hash(strip(before)));
      }
    });

    it(`${name}: remove each edge`, () => {
      const out = d.edges.flatMap((x) => check(d, removeEdge(d, x.id)).map((v) => `${x.id}: ${v}`));
      expect(out).toEqual([]);
    });
  }

  it("move a node to another layer", () => {
    const moves: [string, string][] = [
      ["auth", "processing"],
      ["redis", "kafka"],
      ["retry_runner", "stores"],
      ["operators", "entry"],
      ["full_load", "entry"],
      ["i18n", "processing"],
    ];
    const out = moves.flatMap(([id, layer]) =>
      check(catalogSync, moveNode(catalogSync, id, layer, m)).map((v) => `${id} to ${layer}: ${v}`),
    );
    expect(out).toEqual([]);
  });

  it("add an edge", () => {
    const added = [
      e("tickets_pipe", "i18n", "call", "text"),
      e("tickets_pipe", "redis", "data"),
      e("promotions", "http", "call", "GET"),
      e("admin", "mongo_catalog", "data", "correction"),
      e("relay", "upstream_change", "async"),
    ];
    const out = added.flatMap((x) =>
      check(catalogSync, addEdge(catalogSync, x)).map((v) => `${x.id}: ${v}`),
    );
    expect(out).toEqual([]);
  });

  it("add 40 random edges from a fixed seed, one at a time, without a defect", () => {
    let d = catalogSync;
    const out: string[] = [];
    let changed = 0;
    let nodesMoved = 0;
    for (const x of randomEdges(catalogSync, 40, 7)) {
      const op = addEdge(d, x);
      const r = d10(layoutFramed(d, m), layoutFramed(op.diagram, m), d, op.diagram, op.named);
      out.push(...r.violations.map((v) => `${x.id}: ${v}`));
      out.push(...engineOwned(layout(op.diagram, m)).map((v) => `${x.id}: ${v}`));
      changed += r.changedRoutes.length;
      nodesMoved += r.moved.length;
      d = op.diagram;
    }
    console.log(
      `40 random additions: ${(changed / 40).toFixed(1)} routes and ${(nodesMoved / 40).toFixed(1)} nodes moved per addition`,
    );
    expect(out).toEqual([]);
  });
});

describe("determinism (D15)", () => {
  for (const [name, d] of fixtures) {
    it(`${name} gives an identical scene`, () => {
      expect(hash(layout(d, m))).toEqual(hash(layout(structuredClone(d), m)));
    });
  }

  it("the order of edges in the file decides nothing visible", () => {
    for (const d of [dense, catalogSyncGrouped]) {
      const reversed = { ...d, edges: [...d.edges].reverse() };
      const byId = (x: Diagram) =>
        layout(x, m)
          .edges.map((y) => [y.id, y] as const)
          .sort((a, b) => (a[0] < b[0] ? -1 : 1));
      expect(hash(byId(reversed))).toEqual(hash(byId(d)));
    }
  });
});

describe("slot choice (D24)", () => {
  const cases: [string, string][] = [
    ["stores", "postgres"],
    ["stores", "mongo_catalog"],
    ["processing", "goods_pipe"],
    ["kafka", "retry_v1"],
    ["entry", "relay"],
    ["upstream", "storefront"],
    ["topics", "ticket_topics"],
  ];
  for (const [layer, id] of cases) {
    it(`${id} gets no more crossings than if appended last`, () => {
      const last = {
        ...catalogSync,
        layers: catalogSync.layers.map((l) => {
          if (l.id !== layer) return l;
          const node = l.nodes.find((x) => x.id === id) as DiagramNode;
          return { ...l, nodes: [...l.nodes.filter((x) => x.id !== id), node] };
        }),
      };
      const slot = chooseSlot(last, layer, id, m);
      const lyr = last.layers.find((l) => l.id === layer);
      if (lyr === undefined) throw new Error(layer);
      const rest = lyr.nodes.filter((x) => x.id !== id);
      const node = lyr.nodes.find((x) => x.id === id) as DiagramNode;
      const chosen = {
        ...last,
        layers: last.layers.map((l) =>
          l.id === layer ? { ...l, nodes: [...rest.slice(0, slot), node, ...rest.slice(slot)] } : l,
        ),
      };
      expect(crossings(chosen)).toBeLessThanOrEqual(crossings(last));
    });
  }

  it("a tie goes to the last slot", () => {
    const d: Diagram = {
      ...tiny,
      layers: [
        ...tiny.layers,
        {
          id: "loose",
          label: "Loose",
          nodes: [
            n("x", "x", "service", "s"),
            n("y", "y", "service", "s"),
            n("z", "z", "service", "s"),
          ],
        },
      ],
    };
    expect(chooseSlot(d, "loose", "y", m)).toBe(2);
  });

  it("takes no slot that leaves a line to a group without a box beside it (D28)", () => {
    // x joins outer; after g2 it would stand between inner and c, whose line runs beside.
    const d: Diagram = {
      grafical: 1,
      title: "T",
      density: "normal",
      layers: [
        {
          id: "r",
          label: "R",
          nodes: [
            n("g1", "G1", "service", "m", { group: "outer" }),
            n("g2", "G2", "service", "m", { group: "inner" }),
            n("x", "X", "service", "m", { group: "outer" }),
            n("c", "C", "service", "m"),
          ],
        },
      ],
      groups: [
        { id: "outer", label: "Outer" },
        { id: "inner", label: "Inner", in: "outer" },
      ],
      edges: [e("inner", "c", "call")],
    };
    expect(chooseSlot(d, "r", "x", m)).toBe(1);
  });

  it("never splits a group while a slot keeps it whole", () => {
    for (const l of catalogSyncGrouped.layers) {
      const d = addNode(catalogSyncGrouped, l.id, n("x", "x", "service", "m"), m).diagram;
      expect(validateGroups(d)).toEqual([]);
    }
  });

  it("is fast enough to run on every node.add", () => {
    const layer = dense.layers.find((l) => l.id === "collections");
    if (layer === undefined) throw new Error("no collections layer");
    const t0 = performance.now();
    chooseSlot(dense, "collections", "col_goods_tag", m);
    const ms = performance.now() - t0;
    console.log(
      `chooseSlot on dense, ${layer.nodes.length} slots with the real router: ${ms.toFixed(1)} ms`,
    );
    expect(ms).toBeLessThan(1000);
  });
});

describe("alignment", () => {
  /** A node's centre across, relative to the centre line. */
  const centre = (f: ReturnType<typeof layoutFramed>, id: string) => {
    const r = f.scene.nodes.find((x) => x.id === id)?.rect;
    if (r === undefined) throw new Error(`no node ${id}`);
    return r.x + r.w / 2 - f.centre;
  };

  it("an aligned node sits in its target's column, directly under it", () => {
    const f = layoutFramed(tiny, m);
    expect(centre(f, "db")).toBe(centre(f, "api"));
    expect(mechanical(defects(f.scene))).toEqual([]);
  });

  it("two alignments in one row hold when the order allows both", () => {
    const d: Diagram = {
      ...tiny,
      layers: tiny.layers.map((l) =>
        l.id === "storage"
          ? {
              ...l,
              nodes: [
                n("db", "orders db", "store", "l", { align: "api" }),
                n("queue", "order events", "queue", "s", { align: "worker" }),
              ],
            }
          : l,
      ),
    };
    expect(validateAlignments(d)).toEqual([]);
    const f = layoutFramed(d, m);
    expect(centre(f, "db")).toBe(centre(f, "api"));
    expect(centre(f, "queue")).toBe(centre(f, "worker"));
  });

  it("an alignment against the order of the rows is reported", () => {
    // db comes before queue, but queue's target comes before db's.
    const d: Diagram = {
      ...tiny,
      layers: tiny.layers.map((l) =>
        l.id === "storage"
          ? {
              ...l,
              nodes: [
                n("db", "orders db", "store", "l", { align: "worker" }),
                n("queue", "order events", "queue", "s", { align: "api" }),
              ],
            }
          : l,
      ),
    };
    const problems = validateAlignments(d);
    expect(problems.map((p) => `${p.code} ${p.node}`)).toEqual(["alignment-conflict queue"]);
    expect(problems[0]?.facts).toMatchObject({ node: "queue", fix: ["node align <file> queue"] });
    // The first alignment in row order holds, and the layout still runs.
    const f = layoutFramed(d, m);
    expect(centre(f, "db")).toBe(centre(f, "worker"));
    expect(mechanical(defects(f.scene))).toEqual([]);
  });

  it("alignments that point at each other hold together", () => {
    const d: Diagram = {
      ...tiny,
      layers: [
        { id: "l1", label: "L1", nodes: [n("p", "p", "service", "m", { align: "q" })] },
        { id: "l2", label: "L2", nodes: [n("q", "q", "service", "m", { align: "p" })] },
      ],
      edges: [],
    };
    expect(validateAlignments(d)).toEqual([]);
  });

  it("reports unknown targets, the same layer and itself", () => {
    const d: Diagram = {
      ...tiny,
      layers: [
        {
          id: "l1",
          label: "L1",
          nodes: [n("s", "s", "service", "m", { align: "s" })],
        },
        {
          id: "l2",
          label: "L2",
          nodes: [n("r", "r", "service", "m", { align: "nope" })],
        },
        {
          id: "l3",
          label: "L3",
          nodes: [n("t", "t", "service", "m", { align: "u" }), n("u", "u", "service", "m")],
        },
      ],
      edges: [],
    };
    expect(
      validateAlignments(d)
        .map((p) => `${p.code} ${p.node}`)
        .sort(),
    ).toEqual(["same-layer t", "self-alignment s", "unknown-node r"]);
  });
});

describe("groups", () => {
  const two = (rows: DiagramNode[][]): Diagram => ({
    grafical: 1,
    title: "G",
    density: "normal",
    layers: rows.map((nodes, i) => ({ id: `l${i}`, label: `L${i}`, nodes })),
    groups: [
      { id: "g", label: "system g" },
      { id: "h", label: "system h" },
    ],
    edges: [],
  });

  it("a node between two members of a group is reported", () => {
    const d = two([
      [
        n("a", "a", "service", "m", { group: "g" }),
        n("x", "x", "service", "m"),
        n("b", "b", "service", "m", { group: "g" }),
      ],
    ]);
    expect(validateGroups(d).map((p) => `${p.code} ${p.group} ${p.node}`)).toEqual([
      "group-split g x",
    ]);
  });

  it("groups that swap sides between rows are reported", () => {
    const d = two([
      [n("a", "a", "service", "m", { group: "g" }), n("b", "b", "service", "m", { group: "h" })],
      [n("c", "c", "service", "m", { group: "h" }), n("d", "d", "service", "m", { group: "g" })],
    ]);
    expect(validateGroups(d).map((p) => `${p.code} ${p.group}`)).toEqual(["group-conflict h"]);
    // The layout still runs, and boxes the group that holds.
    const s = layout(d, m);
    expect(s.groups?.map((g) => g.id)).toEqual(["g"]);
    expect(groupIntruders(s)).toEqual([]);
  });

  it("a node beside a group in one row stays out of its box in every row", () => {
    const d = two([
      [n("a", "a", "service", "m", { group: "g" }), n("x", "x", "service", "m")],
      [
        n("b", "b", "service", "m", { group: "g" }),
        n("c", "c", "service", "m", { group: "g" }),
        n("d", "d", "service", "m", { group: "g" }),
      ],
    ]);
    expect(validateGroups(d)).toEqual([]);
    expect(groupIntruders(layout(d, m))).toEqual([]);
  });
});

describe("speed", () => {
  it("lays out 50 nodes and 70 edges in under 30 ms", () => {
    expect(dense.layers.reduce((s, l) => s + l.nodes.length, 0)).toBe(50);
    expect(dense.edges).toHaveLength(70);
    for (let i = 0; i < 5; i++) layout(dense, m);
    const times: number[] = [];
    for (let i = 0; i < 21; i++) {
      const t0 = performance.now();
      layout(dense, m);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[10] ?? 0;
    const worst = times[20] ?? 0;
    const t0 = performance.now();
    layout(catalogSync, m);
    const small = performance.now() - t0;
    console.log(
      `layout: dense median ${median.toFixed(2)} ms, worst ${worst.toFixed(2)} ms; catalog-sync ${small.toFixed(2)} ms`,
    );
    expect(median).toBeLessThan(30);
  });
});

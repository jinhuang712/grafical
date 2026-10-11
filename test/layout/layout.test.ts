import { createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  chooseSlot,
  layout,
  layoutFramed,
  routeStats,
  validateAlignments,
} from "../../src/layout/index.ts";
import type { Diagram, DiagramNode, Edge } from "../../src/model/types.ts";
import { createStubMeasurer } from "../../src/text/stub.ts";
import { e, n } from "../fixtures/build.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { dense } from "../fixtures/dense.ts";
import { edgeCases } from "../fixtures/edge-cases.ts";
import { tiny } from "../fixtures/tiny.ts";
import { defects, mechanical } from "./checks.ts";
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
  ["catalog-sync", catalogSync],
  ["dense", dense],
];
const crossings = (d: Diagram) => routeStats(layout(d, m).edges.map((x) => x.points)).crossings;
const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");

describe("no mechanical defects", () => {
  for (const [name, d] of fixtures) {
    it(name, () => {
      const scene = layout(d, m);
      expect(scene.nodes).toHaveLength(d.layers.reduce((s, l) => s + l.nodes.length, 0));
      expect(scene.edges).toHaveLength(d.edges.length);
      expect(mechanical(defects(scene))).toEqual([]);
      expect(validateAlignments(d)).toEqual([]);
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
  let alone = 0;
  const check = (before: Diagram, op: Applied) => {
    const r = d10(
      layoutFramed(before, m),
      layoutFramed(op.diagram, m),
      before,
      op.diagram,
      op.named,
    );
    ops++;
    alone += r.labelsAlone.length;
    return r.violations;
  };
  afterAll(() => {
    console.log(`${ops} single operations: ${alone} labels moved although their route did not`);
  });
  const nodes = catalogSync.layers.flatMap((l) => l.nodes.map((x) => ({ node: x, layer: l.id })));

  it("add a node to each layer", () => {
    const out = catalogSync.layers.flatMap((l) =>
      check(
        catalogSync,
        addNode(catalogSync, l.id, n(`new_${l.id}`, "new node", "service", "m"), m),
      ).map((v) => `${l.id}: ${v}`),
    );
    expect(out).toEqual([]);
  });

  it("remove each node", () => {
    const out = nodes.flatMap(({ node }) =>
      check(catalogSync, removeNode(catalogSync, node.id)).map((v) => `${node.id}: ${v}`),
    );
    expect(out).toEqual([]);
  });

  it("rename each node, which moves nothing", () => {
    for (const { node } of nodes) {
      const op = renameNode(catalogSync, node.id, `${node.label} v2`);
      const before = layout(catalogSync, m);
      const after = layout(op.diagram, m);
      expect(check(catalogSync, op)).toEqual([]);
      const strip = (s: typeof before) => ({
        ...s,
        nodes: s.nodes.map((x) => ({ ...x, texts: x.id === node.id ? [] : x.texts })),
      });
      expect(hash(strip(after))).toEqual(hash(strip(before)));
    }
  });

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

  it("remove each edge", () => {
    const out = catalogSync.edges.flatMap((x) =>
      check(catalogSync, removeEdge(catalogSync, x.id)).map((v) => `${x.id}: ${v}`),
    );
    expect(out).toEqual([]);
  });

  it("add 40 random edges from a fixed seed, one at a time", () => {
    let d = catalogSync;
    const out: string[] = [];
    let changed = 0;
    let bystanders = 0;
    let labels = 0;
    for (const x of randomEdges(catalogSync, 40, 7)) {
      const op = addEdge(d, x);
      const r = d10(layoutFramed(d, m), layoutFramed(op.diagram, m), d, op.diagram, op.named);
      out.push(...r.violations.map((v) => `${x.id}: ${v}`));
      changed += r.changedRoutes.length;
      bystanders += r.bystanders.length;
      labels += r.labelsAlone.length;
      d = op.diagram;
    }
    console.log(
      `40 random additions: ${(changed / 40).toFixed(1)} routes changed per addition, ${(bystanders / 40).toFixed(1)} of them only by sharing a channel; ${labels} labels moved although their route did not`,
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
    const reversed = { ...dense, edges: [...dense.edges].reverse() };
    const byId = (d: Diagram) =>
      layout(d, m)
        .edges.map((x) => [x.id, x] as const)
        .sort((a, b) => (a[0] < b[0] ? -1 : 1));
    expect(hash(byId(reversed))).toEqual(hash(byId(dense)));
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
  it("an aligned node sits under its target, and its neighbours keep their slots", () => {
    const framed = layoutFramed(tiny, m);
    const scene = framed.scene;
    const db = scene.nodes.find((x) => x.id === "db");
    const api = scene.nodes.find((x) => x.id === "api");
    if (db === undefined || api === undefined) throw new Error("fixture");
    expect(db.rect.x + db.rect.w / 2).toBe(api.rect.x + api.rect.w / 2);
    const plain = layoutFramed(
      {
        ...tiny,
        layers: tiny.layers.map((l) => ({
          ...l,
          nodes: l.nodes.map(({ align: _, ...rest }) => rest),
        })),
      },
      m,
    );
    // Relative to the centre line, the aligned node's neighbour has not moved.
    const queue = (f: typeof framed) => {
      const r = f.scene.nodes.find((x) => x.id === "queue")?.rect;
      return r === undefined ? undefined : { ...r, x: r.x - f.centre };
    };
    expect(queue(framed)).toEqual(queue(plain));
  });

  it("an alignment that cannot hold with the order is reported", () => {
    const d: Diagram = {
      ...tiny,
      layers: tiny.layers.map((l) =>
        l.id === "storage"
          ? {
              ...l,
              nodes: [
                n("queue", "order events", "queue", "s"),
                n("db", "orders db", "store", "l", { align: "worker" }),
              ],
            }
          : l.id === "services"
            ? {
                ...l,
                nodes: [
                  n("worker", "orders-worker", "service", "m"),
                  n("api", "orders-api", "service", "m"),
                ],
              }
            : l,
      ),
    };
    expect(validateAlignments(d).map((p) => p.code)).toEqual(["alignment-blocked"]);
    // The layout still runs, and leaves the node in its own slot.
    expect(mechanical(defects(layout(d, m)))).toEqual([]);
  });

  it("reports unknown targets, the same layer, itself and cycles", () => {
    const d: Diagram = {
      ...tiny,
      layers: [
        {
          id: "l1",
          label: "L1",
          nodes: [
            n("p", "p", "service", "m", { align: "q" }),
            n("s", "s", "service", "m", { align: "s" }),
          ],
        },
        {
          id: "l2",
          label: "L2",
          nodes: [
            n("q", "q", "service", "m", { align: "p" }),
            n("r", "r", "service", "m", { align: "nope" }),
          ],
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
    ).toEqual([
      "alignment-cycle p",
      "alignment-cycle q",
      "same-layer t",
      "self-alignment s",
      "unknown-node r",
    ]);
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

import { describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import type { Defect, DefectCode } from "../../src/errors.ts";
import type { Diagram } from "../../src/model/types.ts";
import type { PlacedText, Rect, Scene, SceneEdge, SceneGroup, SceneNode } from "../../src/scene.ts";
import { createStubMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

const m = createStubMeasurer();

function text(role: PlacedText["role"], s: string, x: number, top: number): PlacedText {
  const size = role === "node-label" ? 13 : 11;
  const w = s.length * size * 0.58;
  return {
    role,
    runs: [{ text: s, face: "inter-400", size, x, y: top + size * 0.8 }],
    bbox: { x, y: top, w, h: size },
  };
}

function node(id: string, x: number, y: number, label = id, w = 120, h = 48): SceneNode {
  const rect: Rect = { x, y, w, h };
  return {
    id,
    layer: "l",
    kind: "service",
    accent: false,
    rect,
    texts: [text("node-label", label, x + 12, y + 12)],
  };
}

function edge(id: string, from: string, to: string, pts: [number, number][]): SceneEdge {
  return { id, from, to, kind: "call", points: pts.map(([x, y]) => ({ x, y })) };
}

function diagramOf(scene: Scene): Diagram {
  return {
    grafical: 1,
    title: "T",
    density: "normal",
    layers: [
      {
        id: "l",
        label: "L",
        nodes: scene.nodes.map((n) => ({ id: n.id, label: n.id, kind: "service", size: "m" })),
      },
    ],
    edges: scene.edges.map((e) => ({ id: e.id, from: e.from, to: e.to, kind: "call" })),
  };
}

function scene(nodes: SceneNode[], edges: SceneEdge[] = []): Scene {
  return {
    width: 600,
    height: 400,
    title: text("title", "T", 16, 16),
    layers: [],
    nodes,
    edges,
  };
}

function run(s: Scene, measurer: Measurer = m): Defect[] {
  return check(diagramOf(s), s, measurer);
}
const codes = (d: Defect[]): DefectCode[] => d.map((x) => x.code);

describe("a clean scene", () => {
  it("has no defects", () => {
    const s = scene(
      [node("a", 40, 40), node("b", 40, 200), node("c", 240, 200)],
      [
        edge("a->b", "a", "b", [
          [100, 88],
          [100, 200],
        ]),
      ],
    );
    expect(run(s)).toEqual([]);
  });
});

describe("overflow", () => {
  it("passes text inside the padded box", () => {
    expect(codes(run(scene([node("a", 40, 40, "short")])))).toEqual([]);
  });

  it("allows a line box 4px from the top and bottom, but not closer", () => {
    const s = scene([node("a", 40, 40, "short")]);
    const n = s.nodes[0] as SceneNode;
    const label = n.texts[0] as PlacedText;
    n.texts = [{ ...label, bbox: { ...label.bbox, y: 45, h: 38 } }];
    expect(codes(run(s))).toEqual([]);
    n.texts = [{ ...label, bbox: { ...label.bbox, y: 42, h: 13 } }];
    expect(codes(run(s))).toEqual(["overflow"]);
  });

  it("fails text that is too wide, and suggests a real command", () => {
    const d = run(scene([node("a", 40, 40, "a very long label indeed")]));
    expect(codes(d)).toEqual(["overflow"]);
    expect(d[0]?.elements).toEqual(["a"]);
    expect(d[0]).toMatchObject({ field: "label" });
    expect(d[0]?.facts.fix).toContain("grafical node rename <file> a --label <shorter text>");
    expect(d[0]?.facts.fix).toContain("grafical node resize <file> a --size l");
  });

  it("fails a label with 3 lines, and a sublabel with 2", () => {
    const s = scene([node("a", 40, 40)]);
    const n = s.nodes[0] as SceneNode;
    n.texts = [
      {
        role: "node-label",
        bbox: { x: 52, y: 48, w: 20, h: 34 },
        runs: [0, 1, 2].map((i) => ({
          text: "x",
          face: "inter-400",
          size: 13,
          x: 52,
          y: 58 + i * 10,
        })),
      },
    ];
    expect(run(s)[0]?.facts).toMatchObject({ lines: 3, max: 2 });
    n.texts = [
      node("a", 40, 40).texts[0] as PlacedText,
      {
        role: "node-sublabel",
        bbox: { x: 52, y: 60, w: 20, h: 20 },
        runs: [0, 1].map((i) => ({
          text: "x",
          face: "inter-400",
          size: 11,
          x: 52,
          y: 66 + i * 10,
        })),
      },
    ];
    const d = run(s);
    expect(codes(d)).toEqual(["overflow"]);
    expect(d[0]?.field).toBe("sublabel");
    expect(d[0]?.facts.lines).toBe(2);
  });
});

describe("node-overlap", () => {
  it("passes nodes that only touch", () => {
    expect(codes(run(scene([node("a", 40, 40), node("b", 160, 40)])))).toEqual([]);
  });
  it("fails intersecting nodes", () => {
    const d = run(scene([node("b", 100, 60), node("a", 40, 40)]));
    expect(codes(d)).toEqual(["node-overlap"]);
    expect(d[0]?.elements).toEqual(["a", "b"]);
  });
});

describe("edge-through-node", () => {
  const nodes = [node("a", 40, 40), node("b", 40, 280), node("mid", 40, 140)];
  it("passes a route beside the node, and one that grazes a port", () => {
    const e = edge("a->b", "a", "b", [
      [40, 88],
      [20, 88],
      [20, 304],
      [40, 304],
    ]);
    expect(codes(run(scene(nodes, [e])))).toEqual([]);
    const graze = edge("a->b", "a", "b", [
      [100, 88],
      [100, 140 + 3],
    ]);
    expect(codes(run(scene(nodes, [graze])))).toEqual([]);
  });
  it("fails a route straight through a third node", () => {
    const e = edge("a->b", "a", "b", [
      [100, 88],
      [100, 280],
    ]);
    const d = run(scene(nodes, [e]));
    expect(codes(d)).toEqual(["edge-through-node"]);
    expect(d[0]?.elements).toEqual(["a->b", "mid"]);
  });
});

describe("label-collision", () => {
  const nodes = [node("a", 40, 40), node("b", 40, 240), node("c", 300, 40), node("d", 300, 240)];
  const e1 = (): SceneEdge =>
    edge("a->b", "a", "b", [
      [100, 88],
      [100, 240],
    ]);
  const e2 = (): SceneEdge =>
    edge("c->d", "c", "d", [
      [360, 88],
      [360, 240],
    ]);
  const label = (x: number, y: number, s = "write"): PlacedText => text("edge-label", s, x, y);

  it("passes a label beside its own edge", () => {
    const a = e1();
    a.label = label(110, 150);
    expect(codes(run(scene(nodes, [a, e2()])))).toEqual([]);
  });
  it("fails a label on a node", () => {
    const a = e1();
    a.label = label(60, 60);
    const d = run(scene(nodes, [a, e2()]));
    expect(codes(d)).toEqual(["label-collision"]);
    expect(d[0]?.elements).toEqual(["a->b", "a"]);
  });
  it("fails a label on another edge's segment", () => {
    const a = e1();
    a.label = label(340, 150);
    const d = run(scene(nodes, [a, e2()]));
    // The same fault is also a text crossing: the label is text (DESIGN.md, "A target picture with measured rules" rule 8).
    expect(codes(d)).toEqual(["label-collision", "text-crossing"]);
    expect(d[0]?.elements).toEqual(["a->b", "c->d"]);
  });
  it("fails two labels that overlap", () => {
    const a = e1();
    const b = e2();
    a.label = label(180, 150);
    b.label = label(190, 152);
    const d = run(scene(nodes, [a, b]));
    expect(codes(d)).toEqual(["label-collision"]);
    expect(d[0]?.elements).toEqual(["a->b", "c->d"]);
  });
});

describe("edge-overlap", () => {
  const nodes = [node("a", 40, 40), node("b", 40, 240), node("c", 300, 40), node("d", 300, 240)];
  it("passes edges that cross, and edges that share an endpoint trunk", () => {
    const x = edge("a->d", "a", "d", [
      [100, 88],
      [100, 160],
      [360, 160],
      [360, 240],
    ]);
    const y = edge("c->b", "c", "b", [
      [360, 88],
      [360, 120],
      [80, 120],
      [80, 240],
    ]);
    expect(codes(run(scene(nodes, [x, y])))).toEqual([]);
    const t1 = edge("a->b", "a", "b", [
      [100, 88],
      [100, 240],
    ]);
    const t2 = edge("a->d", "a", "d", [
      [100, 88],
      [100, 160],
      [360, 160],
      [360, 240],
    ]);
    expect(codes(run(scene(nodes, [t1, t2])))).toEqual([]);
  });
  it("fails two unrelated edges that run along one line", () => {
    const x = edge("a->b", "a", "b", [
      [100, 88],
      [100, 150],
      [200, 150],
      [200, 240],
    ]);
    const y = edge("c->d", "c", "d", [
      [360, 88],
      [360, 150],
      [150, 150],
      [150, 240],
    ]);
    const d = run(scene(nodes, [x, y]));
    expect(codes(d)).toEqual(["edge-overlap"]);
    expect(d[0]?.facts.shared).toBe(50);
  });
  it("passes a bus: unlabelled edges of one kind from one node, sharing a trunk", () => {
    const withE = [...nodes, node("e", 172, 240)];
    const toD = edge("a->d", "a", "d", [
      [100, 88],
      [100, 150],
      [360, 150],
      [360, 240],
    ]);
    const toE = edge("a->e", "a", "e", [
      [100, 88],
      [100, 150],
      [260, 150],
      [260, 240],
    ]);
    expect(codes(run(scene(withE, [toD, toE])))).toEqual([]);
    const async = { ...toE, kind: "async" as const };
    expect(codes(run(scene(withE, [toD, async])))).toEqual(["edge-overlap"]);
  });
  it("passes a shared stretch shorter than 8px", () => {
    const x = edge("a->b", "a", "b", [
      [100, 88],
      [100, 150],
      [150, 150],
      [150, 240],
    ]);
    const y = edge("c->d", "c", "d", [
      [360, 88],
      [360, 150],
      [143, 150],
      [143, 240],
    ]);
    expect(codes(run(scene(nodes, [x, y])))).toEqual([]);
  });
});

describe("missing-glyph", () => {
  const withGlyphs: Measurer = {
    ...m,
    missingGlyphs: (t) => (t.includes("☃") ? ["☃"] : []),
  };
  it("passes when every character can be drawn", () => {
    expect(run(scene([node("a", 40, 40)]), withGlyphs)).toEqual([]);
  });
  it("fails a title, layer, node, sublabel and edge label with a missing glyph", () => {
    const s = scene(
      [node("a", 40, 40), node("b", 40, 200)],
      [
        edge("a->b", "a", "b", [
          [80, 88],
          [80, 200],
        ]),
      ],
    );
    const d = diagramOf(s);
    d.title = "snow ☃";
    const layer = d.layers[0];
    if (!layer) throw new Error("no layer");
    layer.label = "☃";
    const a = layer.nodes[0];
    if (!a) throw new Error("no node");
    a.label = "☃ a";
    a.sublabel = "☃";
    const e = d.edges[0];
    if (!e) throw new Error("no edge");
    e.label = "☃";
    const found = check(d, s, withGlyphs);
    expect(found.map((f) => f.code)).toEqual(Array(5).fill("missing-glyph"));
    expect(found.map((f) => f.elements[0])).toEqual(["a", "a", "a->b", "l", "title"]);
    expect(found.some((f) => f.facts.fix?.[0]?.startsWith("grafical node rename <file> a"))).toBe(
      true,
    );
  });
  it("fails a subtitle, note and group label with a missing glyph", () => {
    const s = scene([node("a", 40, 40)]);
    const d = diagramOf(s);
    d.subtitle = "☃ subtitle";
    d.note = "Not shown: ☃";
    d.groups = [{ id: "g", label: "☃ system" }];
    const found = check(d, s, withGlyphs);
    expect(found.map((f) => f.elements[0])).toEqual(["g", "note", "subtitle"]);
    expect(found.find((f) => f.elements[0] === "g")?.facts.fix?.[0]).toContain(
      "grafical group rename <file> g",
    );
  });
});

describe("ordering", () => {
  it("sorts by code, then elements, and is stable across runs", () => {
    const s = scene([node("b", 60, 40, "a very long label indeed"), node("a", 40, 40)]);
    const d1 = run(s);
    expect(codes(d1)).toEqual(["overflow", "node-overlap"]);
    expect(run(s)).toEqual(d1);
  });
});

describe("owner", () => {
  it('gives the agent what it can fix, and the engine the rest (DESIGN.md, "Defects owned by who can fix them")', () => {
    const s = scene([node("b", 60, 40, "a very long label indeed"), node("a", 40, 40)]);
    expect(run(s).map((d) => [d.code, d.owner])).toEqual([
      ["overflow", "agent"],
      ["node-overlap", "engine"],
    ]);
  });
});

describe("text-crossing", () => {
  const nodes = [node("a", 40, 40), node("b", 40, 240)];
  const down = (x = 100): SceneEdge =>
    edge("a->b", "a", "b", [
      [x, 88],
      [x, 240],
    ]);
  const withEdge = (e: SceneEdge, extra: Partial<Scene> = {}): Scene => ({
    ...scene(nodes, [e]),
    ...extra,
  });
  const box = (role: PlacedText["role"], x: number, y: number): PlacedText =>
    text(role, "words here", x, y);

  it("passes an edge that clears every text", () => {
    const s = withEdge(down(), { subtitle: box("subtitle", 200, 20), note: box("note", 200, 360) });
    expect(codes(run(s))).toEqual([]);
  });

  it("allows a graze of up to 2px, and fails a deeper cut", () => {
    const label = box("subtitle", 101, 120); // x 101..160, the edge at x=100 is 1px away
    expect(codes(run(withEdge(down(), { subtitle: label })))).toEqual([]);
    const cut = box("subtitle", 95, 120); // the edge runs 5px into the text, 3px past the tolerance
    const d = run(withEdge(down(), { subtitle: cut }));
    expect(codes(d)).toEqual(["text-crossing"]);
    expect(d[0]?.owner).toBe("engine");
    expect(d[0]?.elements).toEqual(["a->b", "subtitle"]);
  });

  it("fails an edge through a node's text, a group label, the note and a legend label", () => {
    const through = (s: Scene): Defect[] => run(s);
    const nodeText = withEdge(
      edge("a->b", "a", "b", [
        [56, 60],
        [56, 240],
      ]),
    );
    expect(codes(through(nodeText))).toEqual(["text-crossing"]);
    const groupLabel = withEdge(down(), {
      groups: [
        {
          id: "g",
          rect: { x: 20, y: 100, w: 300, h: 120 },
          label: { ...box("group-label", 90, 120) },
          members: [],
        },
      ],
    });
    expect(through(groupLabel).map((d) => d.elements.join("|"))).toEqual(["a->b|g"]);
    expect(codes(through(withEdge(down(), { note: box("note", 90, 150) })))).toEqual([
      "text-crossing",
    ]);
    const legend = withEdge(down(), {
      legend: [
        {
          style: "solid",
          sample: { x1: 60, x2: 80, y: 130 },
          label: box("legend", 90, 124),
        },
      ],
    });
    expect(through(legend).map((d) => d.elements.join("|"))).toEqual(["a->b|legend-0"]);
  });

  it("does not count an edge's own label, but does count another edge's", () => {
    const own = down();
    own.label = box("edge-label", 95, 140);
    expect(codes(run(withEdge(own)))).not.toContain("text-crossing");
    const other = edge("c->d", "a", "b", [
      [110, 88],
      [110, 240],
    ]);
    const s = scene(nodes, [own, other]);
    expect(
      run(s)
        .filter((d) => d.code === "text-crossing")
        .map((d) => d.elements),
    ).toEqual([["c->d", "a->b"]]);
  });

  it("fails a group's side across an edge's label, and passes a label inside the box", () => {
    const labelled = (x: number): Scene => {
      const e = down();
      e.label = box("edge-label", x, 140);
      return withEdge(e, {
        groups: [
          {
            id: "g",
            rect: { x: 20, y: 100, w: 300, h: 120 },
            label: box("group-label", 30, 104),
            members: [],
          },
        ],
      });
    };
    expect(run(labelled(300)).map((d) => [d.code, ...d.elements])).toEqual([
      ["text-crossing", "g", "a->b"],
    ]);
    expect(codes(run(labelled(200)))).toEqual([]);
  });
});

describe("group-intruder", () => {
  const group = (members: string[]): SceneGroup => ({
    id: "sys",
    rect: { x: 20, y: 20, w: 200, h: 120 },
    label: text("group-label", "sys", 36, 28),
    members,
  });
  const withGroup = (members: string[]): Scene => ({
    ...scene([node("a", 40, 60), node("b", 300, 60), node("c", 160, 90, "c", 60, 40)]),
    groups: [group(members)],
  });

  it("passes when every node inside the box is a member", () => {
    const s = withGroup(["a", "c"]);
    expect(codes(run(s))).toEqual([]);
  });

  it("fails a non-member inside the box, and names the group and the node", () => {
    const d = run(withGroup(["a"]));
    expect(codes(d)).toContain("group-intruder");
    const hit = d.filter((x) => x.code === "group-intruder");
    expect(hit.map((x) => x.elements)).toEqual([["sys", "c"]]);
    expect(hit[0]?.owner).toBe("engine");
  });

  it("passes a non-member that only touches the box", () => {
    const s: Scene = {
      ...scene([node("a", 40, 60), node("x", 220, 60)]),
      groups: [group(["a"])],
    };
    expect(codes(run(s))).toEqual([]);
  });
});

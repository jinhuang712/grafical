// Hand-built scenes for the renderer tests, independent of the layout.

import type { PlacedRun, PlacedText, Rect, Scene, SceneNode, TextRole } from "../../src/scene.ts";
import type { FontFace } from "../../src/text/types.ts";

export function run(text: string, face: FontFace, x: number, y: number, size: number): PlacedRun {
  return { text, face, size, x, y };
}

export function placed(role: TextRole, runs: PlacedRun[], bbox: Rect): PlacedText {
  return { role, runs, bbox };
}

function node(
  id: string,
  kind: SceneNode["kind"],
  rect: Rect,
  label: PlacedText,
  accent = false,
  sub?: PlacedText,
): SceneNode {
  return { id, layer: "l", kind, accent, rect, texts: sub ? [label, sub] : [label] };
}

/** Mixed Chinese and Latin runs, every node and edge kind, one accent, edge labels. */
export function mixedScene(): Scene {
  const title = placed(
    "title",
    [
      run("目录同步", "noto-600", 32, 40, 18),
      run(" catalog-sync", "inter-600", 104, 40, 18),
      run(" 总览", "noto-600", 226, 40, 18),
    ],
    { x: 32, y: 24, w: 250, h: 22 },
  );
  const layerLabel = (t: string, y: number): PlacedText =>
    placed("layer-label", [run(t, "inter-600", 44, y, 12)], { x: 44, y: y - 10, w: 60, h: 14 });
  const nodeLabel = (runs: PlacedRun[], r: Rect): PlacedText => placed("node-label", runs, r);
  return {
    width: 560,
    height: 360,
    title,
    layers: [
      {
        id: "edge",
        band: { x: 32, y: 64, w: 496, h: 80 },
        label: layerLabel("Edge", 84),
      },
      {
        id: "core",
        band: { x: 32, y: 176, w: 496, h: 80 },
        label: placed(
          "layer-label",
          [run("核心", "noto-600", 44, 196, 12), run(" core", "inter-600", 68, 196, 12)],
          { x: 44, y: 186, w: 60, h: 14 },
        ),
      },
      {
        id: "data",
        band: { x: 32, y: 288, w: 496, h: 56 },
        label: layerLabel("Data", 308),
      },
    ],
    nodes: [
      node(
        "web",
        "actor",
        { x: 156, y: 88, w: 120, h: 40 },
        nodeLabel([run("Web 用户", "inter-600", 184, 112, 13)], { x: 184, y: 100, w: 64, h: 16 }),
      ),
      node(
        "gw",
        "external",
        { x: 340, y: 88, w: 160, h: 40 },
        nodeLabel([run("api-gateway", "inter-600", 372, 112, 13)], {
          x: 372,
          y: 100,
          w: 90,
          h: 16,
        }),
      ),
      node(
        "sync",
        "service",
        { x: 156, y: 200, w: 160, h: 48 },
        nodeLabel(
          [run("catalog-sync", "inter-600", 168, 222, 13), run("同步", "noto-600", 250, 222, 13)],
          { x: 168, y: 210, w: 110, h: 16 },
        ),
        true,
        placed("node-sublabel", [run("商品同步服务", "noto-400", 168, 238, 11)], {
          x: 168,
          y: 230,
          w: 66,
          h: 14,
        }),
      ),
      node(
        "q",
        "queue",
        { x: 348, y: 200, w: 152, h: 48 },
        nodeLabel([run("events", "inter-600", 360, 228, 13)], { x: 360, y: 216, w: 44, h: 16 }),
      ),
      node(
        "db",
        "store",
        { x: 156, y: 296, w: 160, h: 40 },
        nodeLabel([run("Mongo & <co>", "inter-600", 176, 320, 13)], {
          x: 176,
          y: 308,
          w: 90,
          h: 16,
        }),
      ),
    ],
    edges: [
      {
        id: "web->gw",
        from: "web",
        to: "gw",
        kind: "call",
        points: [
          { x: 276, y: 108 },
          { x: 340, y: 108 },
        ],
      },
      {
        id: "gw->sync",
        from: "gw",
        to: "sync",
        kind: "call",
        points: [
          { x: 400, y: 128 },
          { x: 400, y: 152 },
          { x: 236, y: 152 },
          { x: 236, y: 200 },
        ],
        label: placed("edge-label", [run("转发 route", "noto-400", 300, 156, 11)], {
          x: 300,
          y: 146,
          w: 56,
          h: 14,
        }),
      },
      {
        id: "sync->q",
        from: "sync",
        to: "q",
        kind: "async",
        points: [
          { x: 316, y: 224 },
          { x: 348, y: 224 },
        ],
      },
      {
        id: "sync->db",
        from: "sync",
        to: "db",
        kind: "data",
        points: [
          { x: 236, y: 248 },
          { x: 236, y: 296 },
        ],
        label: placed("edge-label", [run("write", "inter-400", 244, 276, 11)], {
          x: 244,
          y: 266,
          w: 30,
          h: 14,
        }),
      },
    ],
  };
}

/** The smallest scene: no layers, no edges, one node. */
export function tinyScene(): Scene {
  return {
    width: 200,
    height: 120,
    title: placed("title", [run("Tiny", "inter-600", 16, 32, 18)], { x: 16, y: 16, w: 40, h: 22 }),
    layers: [],
    nodes: [
      node(
        "a",
        "service",
        { x: 40, y: 56, w: 120, h: 48 },
        placed("node-label", [run("A", "inter-600", 52, 84, 13)], { x: 52, y: 72, w: 9, h: 16 }),
      ),
    ],
    edges: [],
  };
}

/** Labels with characters that need escaping, and fractional coordinates. */
export function escapeScene(): Scene {
  const s = tinyScene();
  s.title = placed("title", [run('R&D <"core"> it\'s', "inter-600", 16.123, 32.456, 18)], {
    x: 16,
    y: 16,
    w: 120,
    h: 22,
  });
  return s;
}

type N = [
  id: string,
  kind: SceneNode["kind"],
  x: number,
  y: number,
  w: number,
  label: string,
  lx: number,
  sub: string,
  sx: number,
  accent?: boolean,
];

/** The target look (bench/targets/catalog-sync-grouped): groups, subtitle, legend, footnote. Fictional names. */
export function groupedScene(): Scene {
  const t = (
    role: TextRole,
    s: string,
    x: number,
    y: number,
    size: number,
    bold: boolean,
    w: number,
  ): PlacedText =>
    placed(role, [run(s, bold ? "inter-600" : "inter-400", x, y, size)], {
      x,
      y: y - size,
      w,
      h: size + 4,
    });
  const rows: N[] = [
    ["topics", "queue", 224, 96, 136, "upstream topics", 241.23, "6 broker topics", 252.89],
    ["callers", "actor", 820, 96, 160, "API callers", 866.66, "storefront, promotions", 842.03],
    ["admin", "service", 56, 224, 136, "admin HTTP", 85.42, ":7102, operators", 82.06],
    ["relay", "service", 224, 224, 136, "catalog-relay", 250.18, "tier 1, :7101", 264.04],
    ["handlers", "service", 664, 320, 136, "API handlers", 692.2, "gRPC, HTTP, no auth", 677.32],
    ["retry", "queue", 56, 320, 136, "catalog_retry_v1", 73.7, "re-sent when due", 78],
    ["lines", "queue", 224, 320, 136, "line topics", 259.84, "goods_v1, tickets_v1", 240.8],
    ["pipes", "service", 224, 416, 136, "line pipelines", 250.69, "goods 10, tickets 20", 240.12],
    ["mongo", "store", 440, 416, 144, "MongoDB catalog", 456.06, "goods_*, ticket_*", 469.42, true],
    ["repo", "service", 664, 416, 136, "service, repo", 690.4, "assemble, Find only", 681.5],
    ["geo", "external", 56, 552, 136, "geo-svc", 98.5, "region tree", 96.2],
    ["pg", "store", 224, 552, 136, "Postgres replicas", 232.4, "goods, tickets", 255.61],
  ];
  const nodes: SceneNode[] = rows.map(([id, kind, x, y, w, label, lx, sub, sx, accent]) => ({
    id,
    layer: "l",
    kind,
    accent: accent === true,
    rect: { x, y, w, h: 56 },
    texts: [
      t("node-label", label, lx, y + 26, 13, true, 90),
      t("node-sublabel", sub, sx, y + 42, 11, false, 90),
    ],
  }));
  const g = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    name: string,
    nw: number,
    side: string,
    sx: number,
    members: string[],
  ) => ({
    id,
    rect: { x, y, w, h },
    members,
    label: placed(
      "group-label",
      [run(name, "inter-600", x + 16, y + 24, 12), run(side, "inter-400", sx, y + 24, 11)],
      { x: x + 16, y: y + 12, w: nw, h: 16 },
    ),
  });
  const e = (
    id: string,
    from: string,
    to: string,
    kind: "call" | "async" | "data",
    pts: [number, number][],
    label?: PlacedText,
  ) => ({
    id,
    from,
    to,
    kind,
    points: pts.map(([x, y]) => ({ x, y })),
    ...(label ? { label } : {}),
  });
  return {
    width: 1024,
    height: 648,
    title: t("title", "catalog-sync and catalog-api", 32, 40, 18, true, 300),
    subtitle: t(
      "subtitle",
      "Two Go services coupled only by the shared MongoDB catalog database.",
      32,
      62,
      12,
      false,
      440,
    ),
    note: t("note", "Not shown: retries, metrics.", 32, 632, 11, false, 150),
    legend: [
      {
        style: "solid",
        sample: { x1: 728, x2: 756, y: 36 },
        label: t("legend", "call", 764, 40, 11, false, 24),
      },
      {
        style: "dashed",
        sample: { x1: 801.9, x2: 829.9, y: 36 },
        label: t("legend", "Kafka message", 837.9, 40, 11, false, 80),
      },
    ],
    layers: [],
    groups: [
      g("sync", 32, 184, 352, 312, "catalog-sync", 80, "write side", 136.71, [
        "admin",
        "relay",
        "retry",
        "lines",
        "pipes",
      ]),
      g("api", 640, 280, 184, 216, "catalog-api", 80, "read side", 734.24, ["handlers", "repo"]),
    ],
    nodes,
    edges: [
      e(
        "c1",
        "topics",
        "relay",
        "async",
        [
          [292, 152],
          [292, 224],
        ],
        t("edge-label", "consume", 300, 172, 11, false, 54),
      ),
      e(
        "c2",
        "relay",
        "lines",
        "async",
        [
          [292, 280],
          [292, 320],
        ],
        t("edge-label", "by line", 300, 304, 11, false, 40),
      ),
      e("c3", "callers", "handlers", "call", [
        [900, 152],
        [900, 348],
        [800, 348],
      ]),
      e("c4", "handlers", "repo", "call", [
        [732, 376],
        [732, 416],
      ]),
      e(
        "c5",
        "admin",
        "lines",
        "async",
        [
          [148, 280],
          [148, 300],
          [260, 300],
          [260, 320],
        ],
        t("edge-label", "resync", 178.43, 296, 11, false, 36),
      ),
      e(
        "c6",
        "pipes",
        "retry",
        "async",
        [
          [224, 444],
          [124, 444],
          [124, 376],
        ],
        t("edge-label", "failed", 153.72, 438, 11, false, 30),
      ),
      e("c7", "retry", "lines", "async", [
        [192, 348],
        [224, 348],
      ]),
      e(
        "c8",
        "pipes",
        "mongo",
        "call",
        [
          [360, 444],
          [440, 444],
        ],
        t("edge-label", "persist", 394.42, 438, 11, false, 36),
      ),
      e(
        "c9",
        "repo",
        "mongo",
        "call",
        [
          [664, 444],
          [584, 444],
        ],
        t("edge-label", "Find", 600.8, 438, 11, false, 24),
      ),
      e("c10", "pipes", "geo", "call", [
        [292, 472],
        [292, 516],
        [124, 516],
        [124, 552],
      ]),
      e("c11", "pipes", "pg", "call", [
        [292, 472],
        [292, 552],
      ]),
    ],
  };
}

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

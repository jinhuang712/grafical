// Minimal SVG writer with a fixed element and attribute order (D13, D15).

import { type Point, type Routes, round } from "./geom.js";
import type { EdgeLabel } from "./labels.js";
import { LABEL_FONT } from "./labels.js";
import type { Diagram, EdgeKind, NodeKind } from "./model.js";
import type { Placement } from "./place.js";

type Attrs = [string, string | number][];

function fmt(v: string | number): string {
  return typeof v === "number" ? String(round(v)) : v;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function el(name: string, attrs: Attrs, text?: string): string {
  const a = attrs.map(([k, v]) => ` ${k}="${esc(fmt(v))}"`).join("");
  return text === undefined ? `<${name}${a}/>` : `<${name}${a}>${esc(text)}</${name}>`;
}

const FONT = "Inter, Helvetica, Arial, sans-serif";

const nodeStyle: Record<NodeKind, { fill: string; stroke: string; rx: number; dash?: string }> = {
  service: { fill: "#ffffff", stroke: "#3b5b8c", rx: 6 },
  store: { fill: "#f3f7ee", stroke: "#4f7a3a", rx: 14 },
  queue: { fill: "#fbf6ea", stroke: "#a0782c", rx: 3 },
  external: { fill: "#f4f4f4", stroke: "#777777", rx: 6, dash: "4 3" },
  actor: { fill: "#f4f4f4", stroke: "#777777", rx: 22 },
};

const edgeStyle: Record<EdgeKind, { stroke: string; dash?: string }> = {
  call: { stroke: "#3d4a5c" },
  async: { stroke: "#a0782c", dash: "6 4" },
  data: { stroke: "#4f7a3a" },
};

export function writeSvg(d: Diagram, p: Placement, routes: Routes, labels: EdgeLabel[]): string {
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(p.width)}" height="${fmt(p.height)}" viewBox="0 0 ${fmt(p.width)} ${fmt(p.height)}" font-family="${FONT}">`,
  );
  out.push(el("title", [], d.title));
  out.push(
    el("rect", [
      ["x", 0],
      ["y", 0],
      ["width", p.width],
      ["height", p.height],
      ["fill", "#ffffff"],
    ]),
  );
  out.push(
    el(
      "text",
      [
        ["x", p.theme.margin],
        ["y", p.titleY],
        ["font-size", 16],
        ["font-weight", 600],
        ["fill", "#222222"],
      ],
      d.title,
    ),
  );
  for (const l of p.layers) {
    out.push(
      el("rect", [
        ["x", l.band.x],
        ["y", l.band.y],
        ["width", l.band.w],
        ["height", l.band.h],
        ["rx", 8],
        ["fill", l.index % 2 === 0 ? "#f6f8fb" : "#eef2f7"],
      ]),
    );
    out.push(
      el(
        "text",
        [
          ["x", l.header.x + 4],
          ["y", l.band.y + l.band.h / 2 + 4],
          ["font-size", 12],
          ["font-weight", 600],
          ["fill", "#5a6372"],
        ],
        l.label,
      ),
    );
  }
  for (const edge of d.edges) {
    const pts = routes.get(edge.id);
    if (pts === undefined || pts.length < 2) continue;
    const st = edgeStyle[edge.kind];
    const attrs: Attrs = [
      ["d", pathData(pts)],
      ["fill", "none"],
      ["stroke", st.stroke],
      ["stroke-width", 1.4],
    ];
    if (st.dash !== undefined) attrs.push(["stroke-dasharray", st.dash]);
    out.push(el("path", attrs));
    out.push(
      el("path", [
        ["d", arrowHead(pts)],
        ["fill", st.stroke],
      ]),
    );
  }
  for (const n of p.nodes.values()) {
    const st = nodeStyle[n.node.kind];
    const attrs: Attrs = [
      ["x", n.x],
      ["y", n.y],
      ["width", n.w],
      ["height", n.h],
      ["rx", Math.min(st.rx, n.h / 2)],
      ["fill", st.fill],
      ["stroke", st.stroke],
      ["stroke-width", 1.4],
    ];
    if (st.dash !== undefined) attrs.push(["stroke-dasharray", st.dash]);
    out.push(el("rect", attrs));
    const sub = n.node.sublabel;
    const cy = n.y + n.h / 2;
    out.push(
      el(
        "text",
        [
          ["x", n.x + n.w / 2],
          ["y", sub === undefined ? cy + 4.5 : cy - 2],
          ["font-size", 12],
          ["font-weight", 600],
          ["text-anchor", "middle"],
          ["fill", "#1f2733"],
        ],
        n.node.label,
      ),
    );
    if (sub !== undefined) {
      out.push(
        el(
          "text",
          [
            ["x", n.x + n.w / 2],
            ["y", cy + 13],
            ["font-size", 10],
            ["text-anchor", "middle"],
            ["fill", "#5a6372"],
          ],
          sub,
        ),
      );
    }
  }
  for (const l of labels) {
    if (l.mode === "on") {
      out.push(
        el("rect", [
          ["x", l.x],
          ["y", l.y],
          ["width", l.w],
          ["height", l.h],
          ["rx", 3],
          ["fill", "#ffffff"],
        ]),
      );
    }
    out.push(
      el(
        "text",
        [
          ["x", l.x + l.w / 2],
          ["y", l.y + l.h / 2 + 4],
          ["font-size", LABEL_FONT],
          ["text-anchor", "middle"],
          ["fill", "#3d4a5c"],
        ],
        l.text,
      ),
    );
  }
  out.push("</svg>");
  return `${out.join("\n")}\n`;
}

function pathData(pts: Point[]): string {
  return pts.map((q, i) => `${i === 0 ? "M" : "L"}${fmt(q.x)} ${fmt(q.y)}`).join(" ");
}

function arrowHead(pts: Point[]): string {
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (tip === undefined || prev === undefined) return "";
  const dx = Math.sign(tip.x - prev.x);
  const dy = Math.sign(tip.y - prev.y);
  const len = 8;
  const half = 4;
  const bx = tip.x - dx * len;
  const by = tip.y - dy * len;
  const a = { x: bx - dy * half, y: by + dx * half };
  const b = { x: bx + dy * half, y: by - dx * half };
  return `M${fmt(tip.x)} ${fmt(tip.y)} L${fmt(a.x)} ${fmt(a.y)} L${fmt(b.x)} ${fmt(b.y)} Z`;
}

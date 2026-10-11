// Edge label placement, shared by both routers: each label sits on or beside one
// segment of its own route, clear of nodes, layer labels, other labels and other edges.

import {
  inflate,
  type Point,
  type Routes,
  rectsOverlap,
  segmentHitsRect,
  segments,
} from "./geom.js";
import type { Diagram } from "./model.js";
import { type Placement, type Rect, textWidth } from "./place.js";

export const LABEL_FONT = 11;
const LABEL_H = 16;
const CLEAR = 2;

export interface EdgeLabel extends Rect {
  edgeId: string;
  text: string;
  /** "on" sits on the line and masks it; "beside" sits next to it. */
  mode: "on" | "beside";
}

export interface Labelled {
  labels: EdgeLabel[];
  /** Edges whose label found no free place. */
  unplaced: string[];
}

export function labelBox(text: string): { w: number; h: number } {
  return { w: Math.ceil(textWidth(text, LABEL_FONT)) + 8, h: LABEL_H };
}

export function placeLabels(d: Diagram, p: Placement, routes: Routes): Labelled {
  const obstacles: Rect[] = [];
  for (const l of p.layers) {
    obstacles.push(l.header);
    for (const n of l.nodes) obstacles.push(n);
  }
  const labels: EdgeLabel[] = [];
  const unplaced: string[] = [];
  const canvas: Rect = { x: 0, y: 0, w: p.width, h: p.height };

  for (const edge of d.edges) {
    if (edge.label === undefined) continue;
    const route = routes.get(edge.id) ?? [];
    const { w, h } = labelBox(edge.label);
    const free = (r: Rect, mode: "on" | "beside") => {
      if (r.x < canvas.x || r.y < canvas.y || r.x + r.w > canvas.w || r.y + r.h > canvas.h)
        return false;
      const box = inflate(r, CLEAR);
      if (obstacles.some((o) => rectsOverlap(box, o))) return false;
      if (labels.some((o) => rectsOverlap(box, o))) return false;
      for (const [id, pts] of routes) {
        if (id === edge.id) {
          // A label beside its own line must not touch it either.
          if (mode === "beside" && segments(pts).some((s) => segmentHitsRect(s, inflate(r, 1))))
            return false;
          continue;
        }
        if (segments(pts).some((s) => segmentHitsRect(s, box))) return false;
      }
      return true;
    };
    const placed = candidates(route, w, h).find((c) => free(c.rect, c.mode));
    if (placed === undefined) unplaced.push(edge.id);
    else labels.push({ edgeId: edge.id, text: edge.label, mode: placed.mode, ...placed.rect });
  }
  return { labels, unplaced };
}

interface Candidate {
  rect: Rect;
  mode: "on" | "beside";
}

const FRACTIONS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9];

function candidates(route: Point[], w: number, h: number): Candidate[] {
  const segs = segments(route)
    .map((s, i) => ({ s, i, len: Math.abs(s.b.x - s.a.x) + Math.abs(s.b.y - s.a.y) }))
    .sort((a, b) => b.len - a.len || a.i - b.i);
  const out: Candidate[] = [];
  for (const { s, len } of segs) {
    const vertical = s.a.x === s.b.x;
    const along = vertical ? h : w;
    if (len < along + 8) continue;
    for (const f of FRACTIONS) {
      const x = s.a.x + (s.b.x - s.a.x) * f;
      const y = s.a.y + (s.b.y - s.a.y) * f;
      const on = { x: x - w / 2, y: y - h / 2, w, h };
      if (vertical) {
        out.push({ rect: { x: x + 4, y: y - h / 2, w, h }, mode: "beside" });
        out.push({ rect: { x: x - 4 - w, y: y - h / 2, w, h }, mode: "beside" });
        out.push({ rect: on, mode: "on" });
      } else {
        out.push({ rect: on, mode: "on" });
        for (const dx of [-w / 2, 4, -w - 4]) {
          out.push({ rect: { x: x + dx, y: y - 3 - h, w, h }, mode: "beside" });
          out.push({ rect: { x: x + dx, y: y + 3, w, h }, mode: "beside" });
        }
      }
    }
  }
  return out.map((c) => ({ ...c, rect: snap(c.rect) }));
}

function snap(r: Rect): Rect {
  return { x: Math.round(r.x * 2) / 2, y: Math.round(r.y * 2) / 2, w: r.w, h: r.h };
}

// Defect checker (DESIGN.md, "Defects owned by who can fix them"). Pure: it reads the diagram, the scene and a
// measurer, and returns every mechanical flaw, in a deterministic order.

import { DEFECT_CODES, DEFECT_OWNER, type Defect } from "../errors.ts";
import { arrowheads } from "../layout/badges.ts";
import { asideBoxes, bendsOf, layout } from "../layout/index.ts";
import { addedRow, placeSteps } from "../layout/steps.ts";
import { laneNodes } from "../model/lanes.ts";
import {
  type Diagram,
  GROUP_TITLES,
  type GroupTitle,
  LINE_STYLES,
  MARK_SLOTS,
  markText,
} from "../model/types.ts";
import { wallAllows } from "../model/walls.ts";
import { isEmoji } from "../render/marks.ts";
import type { PlacedText, Rect, Scene, SceneBadge, SceneEdge, SceneNode } from "../scene.ts";
import type { Measurer } from "../text/types.ts";
import { GROUP, NOTE, ROUTE, WALL } from "../theme/geometry.ts";
import { hasHead, lineLook, lineStyle, PAINT } from "../theme/paint.ts";
import { textInside } from "../theme/shapes.ts";
import { themeOf } from "../theme/themes.ts";
import {
  collinearOverlap,
  inset,
  length,
  pointNearRect,
  rectInside,
  rectsOverlap,
  type Segment,
  segmentCrossesRect,
  segmentsOf,
  toBorder,
  toRect,
  toSegment,
} from "./geometry.ts";

/** Text must stay this far inside its node's rect, left and right. */
export const NODE_PADDING = 8;
/**
 * Text must stay this far inside its node's rect, top and bottom. It is smaller
 * than the side padding because a text bbox is a line box: it already includes
 * the fonts' ascent and descent, which reach well beyond the visible letters.
 */
export const NODE_PADDING_Y = 4;
/** An edge may graze a node's rect by this much, at its ports. */
export const PORT_TOLERANCE = 4;
/** How far a text's box may reach under a corner mark before the mark covers it (DESIGN.md, "Marks of any kind"). */
export const MARK_TEXT_SLACK = 3;
/** Two edges must share at least this much length to count as overlapping. */
export const MIN_SHARED_LENGTH = 8;
export const MAX_LABEL_LINES = 2;
export const MAX_SUBLABEL_LINES = 1;

const r2 = (v: number): string => String(Math.round(v * 100) / 100);

function lineCount(t: PlacedText): number {
  return new Set(t.runs.map((r) => r2(r.y))).size;
}

function checkOverflow(diagram: Diagram, scene: Scene, out: Found[]): void {
  const texts = new Map<string, { label: string; sublabel?: string }>();
  for (const layer of diagram.layers) for (const n of layer.nodes) texts.set(n.id, n);
  for (const n of scene.nodes) {
    for (const t of n.texts) {
      const isSub = t.role === "node-sublabel";
      const max = isSub ? MAX_SUBLABEL_LINES : MAX_LABEL_LINES;
      const lines = lineCount(t);
      const field = isSub ? "sublabel" : "label";
      const found = (isSub ? texts.get(n.id)?.sublabel : texts.get(n.id)?.label) ?? "";
      if (lines > max) {
        out.push({ code: "overflow", elements: [n.id], field, found, facts: { lines, max } });
      } else if (!textInside(n.kind, n.rect, t.bbox)) {
        out.push({ code: "overflow", elements: [n.id], field, found, facts: { lines } });
      }
    }
  }
}

/** A lane's label stays inside its header (DESIGN.md, "Swimlanes run one way"). Row lane headers are narrow, so a long label can run out below. */
function checkLaneLabels(scene: Scene, out: Found[]): void {
  for (const x of scene.lanes ?? []) {
    if (rectInside(x.label.bbox, x.head)) continue;
    out.push({
      code: "overflow",
      elements: [x.id],
      field: "label",
      found: x.label.runs.map((r) => r.text).join(" "),
      facts: {},
    });
  }
}

function checkNodeOverlap(scene: Scene, out: Found[]): void {
  const nodes = scene.nodes;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i] as SceneNode;
      const b = nodes[j] as SceneNode;
      if (rectsOverlap(a.rect, b.rect)) {
        out.push({
          code: "node-overlap",
          elements: [a.id, b.id].sort(),
          facts: {},
        });
      }
    }
  }
}

/**
 * A mark must not cover text or another node (DESIGN.md, "Marks of any kind"). A corner mark sticks out of its
 * box, so a long label or a close neighbour can meet it.
 */
function checkMarkCovers(scene: Scene, out: Found[]): void {
  for (const n of scene.nodes) {
    for (const mark of n.marks ?? []) {
      // A text's box is taller and wider than its ink, so a few pixels of it may meet a mark.
      if (n.texts.some((t) => rectsOverlap(inset(t.bbox, MARK_TEXT_SLACK), mark.rect))) {
        out.push({
          code: "mark-covers",
          elements: [n.id],
          field: "icon",
          found: mark.slot,
          facts: { is: "label" },
        });
      }
      for (const other of scene.nodes) {
        if (other.id === n.id || !rectsOverlap(other.rect, mark.rect)) continue;
        // The box with the mark first, then the box it covers.
        out.push({
          code: "mark-covers",
          elements: [n.id, other.id],
          field: "icon",
          found: mark.slot,
          facts: { is: "node" },
        });
      }
    }
  }
}

function checkEdgeThroughNode(scene: Scene, out: Found[]): void {
  for (const e of scene.edges) {
    const segs = segmentsOf(e.points);
    for (const n of scene.nodes) {
      if (n.id === e.from || n.id === e.to) continue;
      const core = inset(n.rect, PORT_TOLERANCE);
      if (segs.some((s) => segmentCrossesRect(s, core))) {
        out.push({
          code: "edge-through-node",
          elements: [e.id, n.id],
          facts: {},
        });
      }
    }
  }
}

function checkLabelCollision(scene: Scene, out: Found[]): void {
  // A label no gutter could hold is the agent's: label-blocked.
  const labelled = scene.edges.filter(
    (e): e is SceneEdge & { label: PlacedText } => !!e.label && e.blocked === undefined,
  );
  for (const e of labelled) {
    const box = e.label.bbox;
    for (const n of scene.nodes) {
      if (rectsOverlap(box, n.rect)) {
        out.push({
          code: "label-collision",
          elements: [e.id, n.id],
          facts: { is: "node" },
        });
      }
    }
    for (const o of scene.edges) {
      if (o.id === e.id) continue;
      if (segmentsOf(o.points).some((s) => segmentCrossesRect(s, box))) {
        out.push({
          code: "label-collision",
          elements: [e.id, o.id],
          facts: { is: "edge" },
        });
      }
    }
  }
  for (let i = 0; i < labelled.length; i++) {
    for (let j = i + 1; j < labelled.length; j++) {
      const a = labelled[i] as SceneEdge & { label: PlacedText };
      const b = labelled[j] as SceneEdge & { label: PlacedText };
      if (rectsOverlap(a.label.bbox, b.label.bbox)) {
        out.push({
          code: "label-collision",
          elements: [a.id, b.id].sort(),
          facts: { is: "label" },
        });
      }
    }
  }
}

/** How near a step's badge may come to anything else before it touches it (DESIGN.md, "Step badges ride the line"). */
export const STEP_CLEAR = 1;

/**
 * A step's badge sits on its own line, clear of every box, every other line and its
 * hops, every text, every other badge, and the borders of groups and bands, as a label
 * keeps clear of them (DESIGN.md, "Step badges ride the line"). It never covers an arrowhead of its own line. A lane's
 * divider may run under it, as under a label.
 */
function checkSteps(scene: Scene, out: Found[]): void {
  const P = scene.paint ?? PAINT;
  // A badge or label no gutter could hold is the agent's: label-blocked.
  const badges = scene.edges.filter(
    (e): e is SceneEdge & { step: SceneBadge } => !!e.step && e.blocked === undefined,
  );
  if (badges.length === 0) return;
  // Each text, with the element it belongs to and what that element is.
  const texts: { id: string; is: string; rect: Rect }[] = [];
  for (const n of scene.nodes) {
    for (const t of n.texts) texts.push({ id: n.id, is: "node", rect: t.bbox });
    for (const mk of n.marks ?? []) texts.push({ id: n.id, is: "mark", rect: mk.rect });
  }
  for (const e of scene.edges)
    if (e.label && e.blocked === undefined)
      texts.push({ id: e.id, is: "label", rect: e.label.bbox });
  for (const g of scene.groups ?? []) {
    texts.push({ id: g.id, is: "group", rect: g.label.bbox });
    if (g.sublabel) texts.push({ id: g.id, is: "group", rect: g.sublabel.bbox });
  }
  for (const b of scene.bands ?? [])
    if (b.label) texts.push({ id: b.id, is: "layer", rect: b.label.bbox });
  for (const x of scene.lanes ?? []) texts.push({ id: x.id, is: "lane", rect: x.head });
  for (const w of scene.walls ?? [])
    if (w.label && w.blocked !== true) texts.push({ id: w.id, is: "wall", rect: w.label.bbox });
  for (const x of scene.notes ?? []) {
    if (x.blocked === true) continue;
    texts.push({ id: x.on, is: "note", rect: x.card ?? x.text.bbox });
    for (const b of [x.mark, x.key]) {
      if (b)
        texts.push({
          id: x.on,
          is: "note",
          rect: { x: b.x - b.r, y: b.y - b.r, w: 2 * b.r, h: 2 * b.r },
        });
    }
  }
  const named: [string, PlacedText | undefined][] = [
    ["subtitle", scene.subtitle],
    ["note", scene.note],
    ["title", scene.title],
  ];
  for (const [id, t] of named) if (t) texts.push({ id, is: id, rect: t.bbox });
  for (const [i, item] of (scene.legend ?? []).entries()) {
    texts.push({ id: `legend-${i}`, is: "legend", rect: item.label.bbox });
  }
  // Lines that are not edges: a labelled wall's divider and a callout's dotted line.
  const others: { id: string; is: string; s: Segment }[] = [];
  for (const w of scene.walls ?? []) if (w.line) others.push({ id: w.id, is: "wall", s: w.line });
  for (const x of scene.notes ?? []) {
    if (x.link && x.blocked !== true) others.push({ id: x.on, is: "note", s: x.link });
  }
  const borders = [
    ...(scene.groups ?? []).map((g) => ({ id: g.id, is: "group", rect: g.rect })),
    ...(scene.bands ?? []).map((b) => ({ id: b.id, is: "layer", rect: b.rect })),
  ];

  for (const e of badges) {
    const b = e.step;
    const c = { x: b.x, y: b.y };
    const near = b.r + STEP_CLEAR;
    const found = new Map<string, string>();
    const hit = (id: string, is: string) => {
      if (!found.has(`${id}\u0000${is}`)) found.set(`${id}\u0000${is}`, is);
    };
    for (const n of scene.nodes) if (toRect(c, n.rect) < near) hit(n.id, "node");
    for (const o of scene.edges) {
      if (o.id === e.id) continue;
      if (segmentsOf(o.points).some((s) => toSegment(c, s) < near)) hit(o.id, "edge");
      if (o.step && Math.hypot(o.step.x - b.x, o.step.y - b.y) < b.r + o.step.r + STEP_CLEAR) {
        hit(o.id, "step");
      }
    }
    for (const t of texts) if (toRect(c, t.rect) < near) hit(t.id, t.is);
    for (const o of others) if (toSegment(c, o.s) < near) hit(o.id, o.is);
    // A line that ends at a group or a band meets its border there.
    for (const x of borders) {
      if (x.id !== e.from && x.id !== e.to && toBorder(c, x.rect) < near) hit(x.id, x.is);
    }
    // Its own arrowheads: from the tip of each back along the line.
    const head = lineLook(e.width, P).arrow.length;
    const heads = { start: e.both === true ? head : 0, end: hasHead(e.kind) ? head : 0 };
    if (arrowheads(e.points, heads).some((s) => toSegment(c, s) < near)) hit(e.id, "arrow");
    for (const [key, is] of found) {
      const id = key.split("\u0000")[0] as string;
      out.push({ code: "step-collision", elements: [e.id, id], facts: { is } });
    }
  }
}

/** An edge may graze a text box by this much before it counts as crossing it (DESIGN.md, "A target picture with measured rules" rule 8). */
export const TEXT_TOLERANCE = 2;

/**
 * No edge segment crosses any text: node labels, other edges' labels, group
 * labels, subtitle, note, title or legend. An edge's own label is exempt,
 * because its segments run next to it by design.
 */
function checkTextCrossing(scene: Scene, out: Found[]): void {
  // Each text, with the element it belongs to and what that element is.
  const targets: { id: string; is: string; text: PlacedText; owner?: string }[] = [];
  for (const n of scene.nodes) {
    for (const t of n.texts) targets.push({ id: n.id, is: "node", text: t });
  }
  // A label no gutter could hold is the agent's: label-blocked.
  for (const e of scene.edges) {
    if (e.label && e.blocked === undefined) {
      targets.push({ id: e.id, is: "edge", text: e.label, owner: e.id });
    }
  }
  // A group's label is the agent's: a line across it is title-blocked.
  for (const b of scene.bands ?? [])
    if (b.label) targets.push({ id: b.id, is: "layer", text: b.label });
  for (const x of scene.lanes ?? []) targets.push({ id: x.id, is: "lane", text: x.label });
  // A wall's label with no place along its wall is the agent's: label-blocked.
  for (const w of scene.walls ?? []) {
    if (w.label && w.blocked !== true) targets.push({ id: w.id, is: "wall", text: w.label });
  }
  // A card with no place beside its target is the agent's: label-blocked.
  for (const x of scene.notes ?? []) {
    if (x.blocked === true) continue;
    targets.push({ id: x.on, is: "note", text: x.text });
    for (const b of [x.mark, x.key]) if (b) targets.push({ id: x.on, is: "note", text: b.label });
  }
  const named: [string, PlacedText | undefined][] = [
    ["subtitle", scene.subtitle],
    ["note", scene.note],
    ["title", scene.title],
  ];
  for (const [id, t] of named) if (t) targets.push({ id, is: id, text: t });
  for (const [i, item] of (scene.legend ?? []).entries()) {
    targets.push({ id: `legend-${i}`, is: "legend", text: item.label });
  }
  for (const e of scene.edges) {
    const segs = segmentsOf(e.points);
    for (const t of targets) {
      if (t.owner === e.id) continue;
      const box = inset(t.text.bbox, TEXT_TOLERANCE);
      if (segs.some((s) => segmentCrossesRect(s, box))) {
        out.push({
          code: "text-crossing",
          elements: [e.id, t.id],
          facts: { is: t.is },
        });
      }
    }
  }
  // The border of a group, a band or a lane is a line too: no edge's label lies across it.
  for (const g of [...(scene.groups ?? []), ...(scene.bands ?? []), ...(scene.lanes ?? [])]) {
    const { x, y, w, h } = g.rect;
    const sides = segmentsOf([
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
      { x, y },
    ]);
    for (const e of scene.edges) {
      if (!e.label || e.blocked !== undefined) continue;
      const box = inset(e.label.bbox, TEXT_TOLERANCE);
      if (sides.some((s) => segmentCrossesRect(s, box))) {
        out.push({ code: "text-crossing", elements: [g.id, e.id], facts: { is: "edge" } });
      }
    }
  }
}

/**
 * A line's label, or its step's badge, that no gutter of its path could hold clear of the
 * other lines, a wall's label that no place along its wall holds clear of the lines across
 * it, and a note's card with no place beside its target: no line moves for it, so it lies
 * across them (DESIGN.md, "The dirty work has edges"). The agent shortens or drops the text,
 * widens a box, changes rows, or makes the note a footnote; the engine never widens a box for
 * its lines (decided by the owner on 2026-10-17). The elements name the line, the wall or the
 * note's target, then what lies across the text: lines, and for a line's label the borders of
 * groups, bands and lanes, for a wall's label or a card boxes; the facts name the gutters a
 * line's label tried.
 */
function checkLabelRoom(scene: Scene, out: Found[]): void {
  const borders = [...(scene.groups ?? []), ...(scene.bands ?? []), ...(scene.lanes ?? [])];
  /** The lines other than `own` that pass through r. */
  const lines = (r: Rect, own?: string) =>
    scene.edges
      .filter((o) => o.id !== own && segmentsOf(o.points).some((s) => segmentCrossesRect(s, r)))
      .map((o) => o.id);
  for (const e of scene.edges) {
    if (e.blocked === undefined) continue;
    const b = e.step;
    const rect =
      e.label?.bbox ??
      (b === undefined ? undefined : { x: b.x - b.r, y: b.y - b.r, w: 2 * b.r, h: 2 * b.r });
    const across: string[] = [];
    if (rect !== undefined) {
      const box = inset(rect, TEXT_TOLERANCE);
      across.push(...lines(box, e.id));
      for (const g of borders) {
        const { x, y, w, h } = g.rect;
        const sides = segmentsOf([
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
          { x, y },
        ]);
        if (sides.some((s) => segmentCrossesRect(s, box))) across.push(g.id);
      }
    }
    out.push({
      code: "label-blocked",
      elements: [e.id, ...across],
      facts: { is: "edge", gutters: e.blocked },
    });
  }
  // A note's card with no place beside its target, at the first place anyway: the lines and
  // boxes in its way there.
  for (const x of scene.notes ?? []) {
    if (x.blocked !== true || x.card === undefined) continue;
    const box = inset(x.card, -NOTE.clear);
    const boxes = scene.nodes
      .filter((n) => n.id !== x.on && rectsOverlap(n.rect, box))
      .map((n) => n.id);
    out.push({
      code: "label-blocked",
      elements: [x.on, ...lines(box, x.on), ...boxes],
      facts: { is: "note" },
    });
  }
  // A wall's label keeps its clearance from lines and boxes as the engine places it.
  for (const w of scene.walls ?? []) {
    if (w.blocked !== true || w.label === undefined) continue;
    const box = inset(w.label.bbox, -WALL.labelClear);
    const boxes = scene.nodes.filter((n) => rectsOverlap(n.rect, box)).map((n) => n.id);
    out.push({
      code: "label-blocked",
      elements: [w.id, ...lines(box), ...boxes],
      facts: { is: "wall" },
    });
  }
}

/** A node that is not a member lies inside a group's box (DESIGN.md, "Rows unseen, groups as systems"). */
function checkGroupIntruder(scene: Scene, out: Found[]): void {
  for (const g of scene.groups ?? []) {
    const members = new Set(g.members);
    for (const n of scene.nodes) {
      if (members.has(n.id) || !rectsOverlap(n.rect, g.rect)) continue;
      out.push({
        code: "group-intruder",
        elements: [g.id, n.id],
        facts: {},
      });
    }
  }
}

/** Every node of a lane lies inside it, and no other node does (DESIGN.md, "Swimlanes run one way"). */
function checkLaneStray(diagram: Diagram, scene: Scene, out: Found[]): void {
  for (const x of scene.lanes ?? []) {
    const members = new Set(laneNodes(diagram, x.id));
    for (const n of scene.nodes) {
      const member = members.has(n.id);
      if (member ? rectInside(n.rect, x.rect) : !rectsOverlap(n.rect, x.rect)) continue;
      out.push({
        code: "lane-stray",
        elements: [x.id, n.id],
        facts: { lane: member ? x.id : "none" },
      });
    }
  }
}

/** A note takes at most four lines at its width (DESIGN.md, "Notes as callouts or footnotes"); the agent shortens it. */
function checkNotes(diagram: Diagram, measurer: Measurer, out: Found[]): void {
  const style = themeOf(diagram).type.note;
  for (const x of diagram.notes ?? []) {
    const lines = measurer.wrap(x.text, style, NOTE.wrap).length;
    if (lines <= NOTE.maxLines) continue;
    out.push({
      code: "overflow",
      elements: [x.on],
      field: "note",
      found: x.text,
      facts: { lines, max: NOTE.maxLines },
    });
  }
}

/**
 * No line passes through a wall's space unless the wall allows it (DESIGN.md, "Walls as space"). A line
 * between the two sides is refused before layout; this finds the others.
 */
function checkWalls(diagram: Diagram, scene: Scene, out: Found[]): void {
  const edges = new Map(diagram.edges.map((e) => [e.id, e]));
  for (const sw of scene.walls ?? []) {
    const wall = diagram.walls?.find((w) => w.id === sw.id);
    if (wall === undefined) continue;
    for (const e of scene.edges) {
      const fact = edges.get(e.id);
      if (fact === undefined || wallAllows(diagram, wall, fact)) continue;
      if (!segmentsOf(e.points).some((s) => segmentCrossesRect(s, sw.rect))) continue;
      out.push({
        code: "wall-crossed",
        elements: [e.id, sw.id],
        facts: {},
      });
    }
  }
}

function sharedEndpoints(a: SceneEdge, b: SceneEdge): string[] {
  return [a.from, a.to].filter((id) => id === b.from || id === b.to);
}

/**
 * The router draws a fan-out of unlabelled edges in one line style from one node as a
 * bus: one trunk that branches (DESIGN.md, "Our own gap router"). Its members share segments on purpose, and
 * a reader loses nothing, since they carry no label and look the same.
 */
function isBus(a: SceneEdge, b: SceneEdge): boolean {
  return a.from === b.from && lineStyle(a.kind) === lineStyle(b.kind) && !a.label && !b.label;
}

function checkEdgeOverlap(scene: Scene, out: Found[]): void {
  const rects = new Map(scene.nodes.map((n) => [n.id, n.rect]));
  const edges = scene.edges;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i] as SceneEdge;
      const b = edges[j] as SceneEdge;
      if (isBus(a, b)) continue;
      const shared = sharedEndpoints(a, b)
        .map((id) => rects.get(id))
        .filter((r): r is Rect => !!r);
      let worst: Segment | undefined;
      for (const s of segmentsOf(a.points)) {
        for (const t of segmentsOf(b.points)) {
          const o = collinearOverlap(s, t);
          if (!o || length(o) < MIN_SHARED_LENGTH) continue;
          const nearShared = shared.some(
            (r) => pointNearRect(o.a, r, PORT_TOLERANCE) || pointNearRect(o.b, r, PORT_TOLERANCE),
          );
          if (nearShared) continue;
          if (!worst || length(o) > length(worst)) worst = o;
        }
      }
      if (worst) {
        out.push({
          code: "edge-overlap",
          elements: [a.id, b.id].sort(),
          facts: { shared: Math.round(length(worst)) },
        });
      }
    }
  }
}

/**
 * A line between boxes in neighbouring rows, from the upper one's bottom into the lower
 * one's top, that bends although each of its ports lies within the other box's side:
 * one x would have served both ends (DESIGN.md, "Who chose is punished"). The lines of a bundle share a port and bend
 * where they part, by design.
 */
function checkNeedlessBend(scene: Scene, out: Found[]): void {
  const row = new Map(scene.layers.map((l, i) => [l.id, i]));
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  const key = (id: string, p: { x: number; y: number }) => `${id}@${p.x},${p.y}`;
  const shared = new Map<string, number>();
  for (const e of scene.edges) {
    for (const [id, p] of [
      [e.from, e.points[0]],
      [e.to, e.points.at(-1)],
    ] as const) {
      if (p !== undefined) shared.set(key(id, p), (shared.get(key(id, p)) ?? 0) + 1);
    }
  }
  const inset = ROUTE.portMin / 2 + 2;
  const within = (x: number, r: Rect) => x >= r.x + inset - 1 && x <= r.x + r.w - inset + 1;
  for (const e of scene.edges) {
    const a = nodes.get(e.from);
    const b = nodes.get(e.to);
    const p = e.points[0];
    const q = e.points.at(-1);
    if (a === undefined || b === undefined || p === undefined || q === undefined) continue;
    const ra = row.get(a.layer);
    const rb = row.get(b.layer);
    if (ra === undefined || rb === undefined || Math.abs(ra - rb) !== 1) continue;
    if ((shared.get(key(e.from, p)) ?? 0) > 1 || (shared.get(key(e.to, q)) ?? 0) > 1) continue;
    const [up, upPort, low, lowPort] = ra < rb ? [a, p, b, q] : [b, q, a, p];
    if (Math.abs(upPort.y - (up.rect.y + up.rect.h)) > 2 || Math.abs(lowPort.y - low.rect.y) > 2) {
      continue;
    }
    if (!within(upPort.x, low.rect) || !within(lowPort.x, up.rect)) continue;
    const bends = bendsOf(e.points);
    if (bends === 0) continue;
    out.push({ code: "needless-bend", elements: [e.id], facts: { count: bends } });
  }
}

/**
 * A box placed by steps that lies wholly beside every box it connects to (DESIGN.md, "Who chose is punished"): the agent
 * chose its cell, so the agent moves it, between them. A box in a row that lies aside is
 * the engine's to avoid, by its slot choice.
 */
function checkStepAside(diagram: Diagram, scene: Scene, out: Found[]): void {
  const stepped = new Set(
    diagram.layers.flatMap((l) => l.nodes.filter((n) => n.from !== undefined).map((n) => n.id)),
  );
  for (const { box, users } of asideBoxes(scene)) {
    if (!stepped.has(box)) continue;
    out.push({ code: "box-aside", elements: [box], facts: { node: box, nodes: users } });
  }
}

function checkMissingGlyphs(diagram: Diagram, m: Measurer, out: Found[]): void {
  const add = (id: string, field: string, text: string | undefined) => {
    if (!text) return;
    const missing = m.missingGlyphs(text);
    if (missing.length === 0) return;
    out.push({
      code: "missing-glyph",
      elements: [id],
      field,
      found: text,
      facts: { chars: missing },
    });
  };
  add("title", "title", diagram.title);
  add("subtitle", "subtitle", diagram.subtitle);
  add("note", "note", diagram.note);
  for (const g of diagram.groups ?? []) {
    add(g.id, "label", g.label);
    add(g.id, "sublabel", g.sublabel);
  }
  for (const x of diagram.lanes ?? []) add(x.id, "label", x.label);
  for (const line of LINE_STYLES) add(`legend-${line}`, "text", diagram.legend?.[line]);
  for (const [w, text] of Object.entries(diagram.legend?.weights ?? {})) {
    add(`legend-${w}`, "text", text);
  }
  for (const [mark, text] of Object.entries(diagram.legend?.marks ?? {})) {
    add(`legend-${mark}`, "text", text);
  }
  for (const layer of diagram.layers) {
    if (!addedRow(layer.id)) add(layer.id, "label", layer.label);
    for (const n of layer.nodes) {
      add(n.id, "label", n.label);
      add(n.id, "sublabel", n.sublabel);
      for (const slot of MARK_SLOTS) {
        const mark = n.icons?.[slot];
        // An emoji is drawn as a picture, so only plain text needs the fonts.
        const text = mark === undefined ? undefined : markText(mark);
        if (text !== undefined && !isEmoji(text)) add(n.id, "icon", text);
      }
    }
  }
  for (const e of diagram.edges) add(e.id, "label", e.label);
  // A wall's label (DESIGN.md, "Walls as space") and a note (DESIGN.md, "Notes as callouts or footnotes") are drawn too.
  for (const w of diagram.walls ?? []) add(w.id, "label", w.label);
  for (const x of diagram.notes ?? []) add(x.on, "note", x.text);
}

export { measureTaste, type TasteReport, type TasteRule } from "./taste.ts";

/** The lines that pass a group's label or its sublabel nearer than the engine keeps its own lines, by id. */
export function acrossTitle(scene: Scene, id: string): string[] {
  const g = scene.groups?.find((x) => x.id === id);
  if (g === undefined) return [];
  const boxes = [g.label, ...(g.sublabel ? [g.sublabel] : [])].map((t) =>
    inset(t.bbox, -GROUP.labelClear),
  );
  return scene.edges
    .filter((e) => segmentsOf(e.points).some((s) => boxes.some((b) => segmentCrossesRect(s, b))))
    .map((e) => e.id);
}

/**
 * A label at a place the agent stated moves no line and no box, so a line across it is the
 * agent's to fix: another place, or none (DESIGN.md, "The agent states where a group's label sits").
 * The facts name the places where no line would come near it.
 */
function checkTitles(
  facts: Diagram,
  scene: Scene,
  measurer: Measurer,
  places: boolean,
  out: Found[],
): void {
  for (const group of facts.groups ?? []) {
    const place = group.titleAt;
    const lines = acrossTitle(scene, group.id);
    if (lines.length === 0) continue;
    const at = (p: GroupTitle): Diagram => ({
      ...facts,
      groups: (facts.groups ?? []).map((g) => (g.id === group.id ? { ...g, titleAt: p } : g)),
    });
    // Each place is a layout of its own.
    const clear = places
      ? GROUP_TITLES.filter(
          (p) => p !== place && acrossTitle(layout(at(p), measurer), group.id).length === 0,
        )
      : undefined;
    out.push({
      code: "title-blocked",
      elements: [group.id, ...lines],
      facts: {
        ...(place === undefined ? {} : { place }),
        ...(clear === undefined ? {} : { clear }),
      },
    });
  }
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A defect before its owner is filled in from its code. */
type Found = Omit<Defect, "owner">;

/**
 * Every defect, agent-owned and engine-owned, in a deterministic order (DESIGN.md, "Defects owned by who can fix them").
 * Without `places`, a blocked title does not list the places clear of lines, each of which takes a layout: for the
 * write path, which only asks which defects a diagram has while it finds where one comes from.
 */
export function check(facts: Diagram, scene: Scene, measurer: Measurer, places = true): Defect[] {
  // Boxes placed by steps are checked in the rows they are drawn in (DESIGN.md, "Steps from another box").
  const diagram = placeSteps(facts).d;
  const out: Found[] = [];
  checkOverflow(diagram, scene, out);
  checkLaneLabels(scene, out);
  checkNodeOverlap(scene, out);
  checkMarkCovers(scene, out);
  checkEdgeThroughNode(scene, out);
  checkLabelCollision(scene, out);
  checkSteps(scene, out);
  checkEdgeOverlap(scene, out);
  checkNeedlessBend(scene, out);
  checkStepAside(diagram, scene, out);
  checkTextCrossing(scene, out);
  checkLabelRoom(scene, out);
  checkGroupIntruder(scene, out);
  checkLaneStray(diagram, scene, out);
  checkWalls(diagram, scene, out);
  checkTitles(facts, scene, measurer, places, out);
  checkNotes(diagram, measurer, out);
  checkMissingGlyphs(diagram, measurer, out);
  const order = (d: Found): number => DEFECT_CODES.indexOf(d.code);
  return out
    .sort(
      (a, b) =>
        order(a) - order(b) ||
        compare(a.elements.join("\u0000"), b.elements.join("\u0000")) ||
        compare(
          `${a.field ?? ""}\u0000${a.found ?? ""}`,
          `${b.field ?? ""}\u0000${b.found ?? ""}`,
        ) ||
        compare(JSON.stringify(a.facts), JSON.stringify(b.facts)),
    )
    .map((d) => ({
      code: d.code,
      owner: DEFECT_OWNER[d.code],
      elements: d.elements,
      ...(d.field !== undefined ? { field: d.field } : {}),
      ...(d.found !== undefined ? { found: d.found } : {}),
      facts: d.facts,
    }));
}

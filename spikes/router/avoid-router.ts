// libavoid-js adapter: shapes fixed, orthogonal routing, one pin per node side.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AvoidLib } from "libavoid-js";
import { type Point, type Routes, simplify } from "./geom.js";
import type { Diagram } from "./model.js";
import type { Placement, Rect } from "./place.js";

// The package's own typings are loose (`[x: string]: any`). This is the subset we use.
interface AObj {
  delete(): void;
}
interface APoint extends AObj {
  x: number;
  y: number;
}
interface ARouter extends AObj {
  setRoutingParameter(p: unknown, v: number): void;
  setRoutingOption(o: unknown, v: boolean): void;
  processTransaction(): void;
}
interface AConn extends AObj {
  displayRoute(): AObj & { size(): number; at(i: number): APoint & AObj };
}
interface AvoidApi {
  Router: new (flags: number) => ARouter;
  Point: new (x: number, y: number) => APoint;
  Rectangle: new (topLeft: APoint, bottomRight: APoint) => AObj;
  ShapeRef: new (router: ARouter, poly: AObj) => AObj;
  ShapeConnectionPin: new (
    shape: AObj,
    classId: number,
    xOffset: number,
    yOffset: number,
    proportional: boolean,
    insideOffset: number,
    visDirs: number,
  ) => AObj & { setExclusive(v: boolean): void };
  ConnEnd: new (shape: AObj, classId: number) => AObj;
  ConnRef: new (router: ARouter, src: AObj, dst: AObj) => AConn;
  RouterFlag: { OrthogonalRouting: { value: number } };
  RoutingParameter: Record<string, unknown>;
  RoutingOption: Record<string, unknown>;
}

let api: AvoidApi | undefined;

export async function loadAvoid(): Promise<void> {
  if (api !== undefined) return;
  const entry = fileURLToPath(import.meta.resolve("libavoid-js"));
  await AvoidLib.load(join(dirname(entry), "libavoid.wasm"));
  api = AvoidLib.getInstance() as unknown as AvoidApi;
}

const TOP = 1;
const BOTTOM = 2;
const LEFT = 3;
const RIGHT = 4;
// libavoid ConnDirFlags
const DIR_UP = 1;
const DIR_DOWN = 2;
const DIR_LEFT = 4;
const DIR_RIGHT = 8;

export interface AvoidOptions {
  shapeBuffer: number;
  nudging: number;
  sharedPaths?: boolean;
  connected?: boolean;
}

export const defaultAvoidOptions: AvoidOptions = { shapeBuffer: 6, nudging: 24 };

// libavoid-js 0.5 uses embind, which frees any C++ object whose JS handle is garbage
// collected. Shapes, pins and connectors belong to the router, so their handles are
// kept alive here forever; value objects are deleted as soon as they are copied.
const owned: AObj[] = [];

export function avoidRoute(
  d: Diagram,
  p: Placement,
  opts: AvoidOptions = defaultAvoidOptions,
): Routes {
  const A = api;
  if (A === undefined) throw new Error("call loadAvoid() first");
  const temps: AObj[] = [];
  const tmp = <T extends AObj>(o: T): T => {
    temps.push(o);
    return o;
  };
  const keep = <T extends AObj>(o: T): T => {
    owned.push(o);
    return o;
  };
  const router = keep(new A.Router(A.RouterFlag.OrthogonalRouting.value));
  router.setRoutingParameter(A.RoutingParameter.shapeBufferDistance, opts.shapeBuffer);
  router.setRoutingParameter(A.RoutingParameter.idealNudgingDistance, opts.nudging);
  router.setRoutingOption(
    A.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes,
    opts.connected ?? true,
  );
  router.setRoutingOption(
    A.RoutingOption.nudgeSharedPathsWithCommonEndPoint,
    opts.sharedPaths ?? true,
  );

  const rect = (r: Rect) =>
    tmp(new A.Rectangle(tmp(new A.Point(r.x, r.y)), tmp(new A.Point(r.x + r.w, r.y + r.h))));
  const shapes = new Map<string, AObj>();
  for (const l of p.layers) {
    keep(new A.ShapeRef(router, rect(l.header)));
    for (const n of l.nodes) {
      const s = keep(new A.ShapeRef(router, rect(n)));
      const pins: [number, number, number, number][] = [
        [TOP, 0.5, 0, DIR_UP],
        [BOTTOM, 0.5, 1, DIR_DOWN],
        [LEFT, 0, 0.5, DIR_LEFT],
        [RIGHT, 1, 0.5, DIR_RIGHT],
      ];
      for (const [cls, fx, fy, dir] of pins) {
        // Pins are exclusive by default: a second connector on the pin gets no route.
        keep(new A.ShapeConnectionPin(s, cls, fx, fy, true, 0, dir)).setExclusive(false);
      }
      shapes.set(n.id, s);
    }
  }
  const conns: [string, AConn][] = [];
  for (const edge of d.edges) {
    const u = p.nodes.get(edge.from);
    const v = p.nodes.get(edge.to);
    const su = shapes.get(edge.from);
    const sv = shapes.get(edge.to);
    if (u === undefined || v === undefined || su === undefined || sv === undefined) {
      throw new Error(`unknown node in ${edge.id}`);
    }
    // The same sides as the gap router uses, so the comparison is about routing only.
    let a: number;
    let b: number;
    if (u.layer < v.layer) [a, b] = [BOTTOM, TOP];
    else if (u.layer > v.layer) [a, b] = [TOP, BOTTOM];
    else if (Math.abs(u.order - v.order) === 1)
      [a, b] = u.order < v.order ? [RIGHT, LEFT] : [LEFT, RIGHT];
    else [a, b] = [BOTTOM, BOTTOM];
    const c = keep(new A.ConnRef(router, tmp(new A.ConnEnd(su, a)), tmp(new A.ConnEnd(sv, b))));
    conns.push([edge.id, c]);
  }
  for (const t of temps) t.delete();
  router.processTransaction();
  const routes: Routes = new Map();
  for (const [id, c] of conns) {
    const r = c.displayRoute();
    const pts: Point[] = [];
    for (let i = 0; i < r.size(); i++) {
      const q = r.at(i);
      pts.push({ x: q.x, y: q.y });
      q.delete();
    }
    r.delete();
    routes.set(id, simplify(pts));
  }
  // Deleting the router frees its shapes and connectors. Their handles stay in owned.
  router.delete();
  return routes;
}

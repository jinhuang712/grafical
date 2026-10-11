import { Resvg } from "@resvg/resvg-js";
import { avoidRoute } from "./avoid-router.js";
import { check, type Report } from "./checks.js";
import { gapRoute } from "./gap-router.js";
import type { Routes } from "./geom.js";
import { placeLabels } from "./labels.js";
import type { Diagram } from "./model.js";
import { place } from "./place.js";
import type { Layout } from "./stability.js";
import { writeSvg } from "./svg.js";

export type RouterName = "gap" | "avoid";
export const routerNames: RouterName[] = ["gap", "avoid"];

export interface Result extends Layout {
  unplaced: string[];
  svg: string;
  report: Report;
}

export function route(name: RouterName, d: Diagram, p: ReturnType<typeof place>): Routes {
  return name === "gap" ? gapRoute(d, p) : avoidRoute(d, p);
}

export function run(name: RouterName, d: Diagram): Result {
  const placement = place(d);
  const routes = route(name, d, placement);
  const lab = placeLabels(d, placement, routes);
  return {
    placement,
    routes,
    labels: lab.labels,
    unplaced: lab.unplaced,
    svg: writeSvg(d, placement, routes, lab.labels),
    report: check(d, placement, routes, lab),
  };
}

export function toPng(svg: string, zoom = 1): Buffer {
  const r = new Resvg(svg, {
    fitTo: { mode: "zoom", value: zoom },
    font: { loadSystemFonts: true },
  });
  return r.render().asPng();
}

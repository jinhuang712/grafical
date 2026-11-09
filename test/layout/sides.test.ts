// Side turns (specs/decisions, "Edges meet any side"): an edge that leaves or enters a node by its side turns once.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { drawing } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe("side turns", () => {
  // Found by the owner on 2026-10-15 in a lane with a column per phase: each of these edges
  // bent twice, because another edge already turned through the gap beside its target.
  it("share a gap of a layer when their runs along the layer keep apart", () => {
    const file = join(import.meta.dirname, "../fixtures/order-lanes.grafical");
    const d = readDiagram(readFileSync(file, "utf8")) as Diagram;
    const s = layout(d, m);
    const drawnEdges = drawing(d, s).edges;
    const of = (id: string) => drawnEdges.find((l) => l.id === id);
    expect(of("ship->receive")).toMatchObject({ leaves: "top", enters: "left", bends: 1 });
    expect(of("pay->close")).toMatchObject({ enters: "left", bends: 1 });
    // The edges already in those gaps keep their turns.
    expect(of("backorder->order")).toMatchObject({ enters: "right", bends: 1 });
    expect(of("invoice->pay")).toMatchObject({ leaves: "right", bends: 1 });
    expect(check(d, s, m)).toEqual([]);
  });

  // Found by the owner on 2026-10-15: the load balancer's edge into zone B bent twice, because
  // its turn would have started where the edge into zone A turned, at the middle of its bottom.
  it("move along the source's side to keep clear of another turn from it", () => {
    const file = join(import.meta.dirname, "../fixtures/two-zones.grafical");
    const d = readDiagram(readFileSync(file, "utf8")) as Diagram;
    const s = layout(d, m);
    const drawnEdges = drawing(d, s).edges;
    const of = (id: string) => drawnEdges.find((l) => l.id === id);
    expect(of("alb->web-a")).toMatchObject({ leaves: "bottom", enters: "right", bends: 1 });
    expect(of("alb->web-b")).toMatchObject({ leaves: "bottom", enters: "left", bends: 1 });
    expect(check(d, s, m)).toEqual([]);
  });
  // Found on 2026-10-16: "sends confirmations via" is wider than the 120 px a label between
  // neighbours could take, so the edge went round under the layer with its label hanging off.
  it("run straight between neighbours with a label up to thirty characters", () => {
    const d = readDiagram(`<diagram> {
  format: 1
  title: "wide"
  density: normal
}

<layer> core {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @core
}

<order> core-order {
  of: @core
  axis: across
  items:
    @api
    @mail
}

<node> api {
  type: @service
  text: "Booking API"
  layer: @core
}

<node> mail {
  type: @external
  text: "Email service"
  layer: @core
}

<edge> api->mail {
  from: @api
  to: @mail
  type: @call
}

<label> core-label {
  on: @core
  text: "Core"
}

<label> api->mail-label {
  on: @api->mail
  text: "sends confirmations via"
}
`) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    const edge = drawing(d, s).edges.find((l) => l.id === "api->mail");
    expect(edge).toMatchObject({ leaves: "right", enters: "left", bends: 0 });
  });
  // Found by the owner on 2026-10-16 in a booking C4 diagram: the web app's edge turned
  // into the API's side, and the mobile app's edge beside it bent twice into the API's top.
  it("enter one side together, the nearer above", () => {
    const d = readDiagram(`<diagram> {
  format: 1
  title: "entries"
  density: normal
}

<layer> apps {
}

<layer> core {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @apps
    @core
}

<order> apps-order {
  of: @apps
  axis: across
  items:
    @web
    @mobile
    @portal
}

<order> core-order {
  of: @core
  axis: across
  items:
    @api
}

<node> web {
  type: @service
  text: "Web app"
  layer: @apps
}

<node> mobile {
  type: @service
  text: "Mobile app"
  layer: @apps
}

<node> portal {
  type: @service
  text: "Partner portal"
  layer: @apps
}

<node> api {
  type: @service
  text: "Booking API"
  layer: @core
  align: @portal
}

<edge> web->api {
  from: @web
  to: @api
  type: @call
}

<edge> mobile->api {
  from: @mobile
  to: @api
  type: @call
}

<edge> portal->api {
  from: @portal
  to: @api
  type: @call
}

<label> apps-label {
  on: @apps
  text: "Apps"
}

<label> core-label {
  on: @core
  text: "Core"
}
`) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    const drawnEdges = drawing(d, s).edges;
    const of = (id: string) => drawnEdges.find((l) => l.id === id);
    expect(of("web->api")).toMatchObject({ enters: "left", bends: 1, crosses: [] });
    expect(of("mobile->api")).toMatchObject({ enters: "left", bends: 1, crosses: [] });
    const end = (id: string) => s.edges.find((e) => e.id === id)?.points.at(-1)?.y ?? 0;
    expect(end("mobile->api")).toBeLessThan(end("web->api"));
  });
});

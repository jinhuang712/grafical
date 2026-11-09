// A group's label sits in its head where the edges into its first layer keep their centres.

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe("group label seats", () => {
  // Found by the owner on 2026-10-16 in a booking C4 diagram: the label "Booking app
  // software system" was wider than the room between the edges into the group's first
  // layer, so the traveller's edge into the web app was pushed to the frame's left edge.
  it("make room between two edges rather than push an edge off centre", () => {
    const d = readDiagram(`<diagram> {
  format: 1
  title: "seats"
  density: normal
}

<layer> people {
}

<layer> apps {
}

<group> app {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @people
    @apps
}

<order> people-order {
  of: @people
  axis: across
  items:
    @traveller
    @hotel
}

<order> apps-order {
  of: @apps
  axis: across
  items:
    @web
    @mobile
    @portal
}

<node> traveller {
  type: @actor
  text: "Traveller"
  layer: @people
}

<node> hotel {
  type: @actor
  text: "Hotel staff"
  layer: @people
}

<node> web {
  type: @service
  text: "Web app"
  layer: @apps
  group: @app
}

<node> mobile {
  type: @service
  text: "Mobile app"
  layer: @apps
  group: @app
}

<node> portal {
  type: @service
  text: "Partner portal"
  layer: @apps
  group: @app
}

<edge> traveller->web {
  from: @traveller
  to: @web
  type: @call
}

<edge> traveller->mobile {
  from: @traveller
  to: @mobile
  type: @call
}

<edge> hotel->portal {
  from: @hotel
  to: @portal
  type: @call
}

<label> people-label {
  on: @people
  text: "People"
}

<label> apps-label {
  on: @apps
  text: "Apps"
}

<label> app-label {
  on: @app
  text: "Booking app"
  sublabel: "software system"
}
`) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    for (const [id, to] of [
      ["traveller->web", "web"],
      ["hotel->portal", "portal"],
    ]) {
      const e = s.edges.find((x) => x.id === id);
      const r = s.nodes.find((n) => n.id === to)?.rect;
      if (e === undefined || r === undefined) throw new Error(id);
      expect(e.points.at(-1)?.x, id).toBe(r.x + r.w / 2);
    }
  });
});

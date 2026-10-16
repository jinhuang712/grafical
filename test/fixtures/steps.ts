// Numbered steps (DESIGN.md, "Step badges ride the line"): one checkout request followed in order. Badges on labelled and
// unlabelled lines, on lines up and down, on two lines between neighbours, on a
// two-way line and on a line to a whole group, and one line left unnumbered.

import type { Diagram, Edge } from "../../src/model/types.ts";
import { e, n } from "./build.ts";

const step = (edge: Edge, number: number, extra: Partial<Edge> = {}): Edge => ({
  ...edge,
  ...extra,
  step: number,
});

export const steps: Diagram = {
  grafical: 1,
  title: "Checkout request",
  subtitle: "One order, from the shopper's click to the saved order.",
  density: "normal",
  layers: [
    { id: "row-users", label: "Users", nodes: [n("shopper", "shopper", "actor", "m")] },
    { id: "row-entry", label: "Entry", nodes: [n("gateway", "API gateway", "service", "m")] },
    {
      id: "row-core",
      label: "Core",
      nodes: [
        n("checkout", "checkout", "service", "m", { group: "shop" }),
        n("payments", "payments", "service", "m", { group: "pay" }),
      ],
    },
    {
      id: "row-data",
      label: "Data",
      nodes: [
        n("orders", "orders db", "store", "m", { group: "shop" }),
        n("events", "order events", "queue", "m", { group: "shop" }),
        n("card", "card network", "external", "m"),
      ],
    },
  ],
  groups: [
    { id: "shop", label: "shop" },
    { id: "pay", label: "payments" },
  ],
  edges: [
    step(e("shopper", "gateway", "call", "POST /checkout"), 1),
    step(e("gateway", "checkout", "call"), 2),
    step(e("checkout", "payments", "call", "charge"), 3),
    step(e("payments", "card", "call", "authorize"), 4, { both: true }),
    step(e("payments", "checkout", "async", "approved"), 5),
    step(e("checkout", "orders", "data", "save"), 6),
    step(e("checkout", "events", "async", "order-placed"), 7),
    step(e("events", "pay", "async"), 8),
    e("gateway", "payments", "optional", "health"),
  ],
};

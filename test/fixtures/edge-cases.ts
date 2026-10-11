// Every routing edge case in one small diagram: a self-loop, two edges between one
// pair, edges both ways, edges within a layer, edges that skip layers, the left-most
// gap, many ends on one side, and a fan-out bus.

import type { Diagram } from "../../src/model/types.ts";
import { e, n } from "./build.ts";

export const edgeCases: Diagram = {
  grafical: 1,
  title: "Edge cases",
  density: "normal",
  layers: [
    {
      id: "a",
      label: "Callers",
      nodes: [n("a1", "web", "actor", "m"), n("a2", "jobs", "service", "s")],
    },
    {
      id: "b",
      label: "Services",
      nodes: [
        n("b1", "orders", "service", "m"),
        n("b2", "billing", "service", "m"),
        n("b3", "ledger", "store", "l"),
      ],
    },
    { id: "c", label: "Events", nodes: [n("c1", "events", "queue", "m")] },
  ],
  edges: [
    e("b2", "b2", "call", "retry"),
    e("a1", "b1", "call", "read"),
    { ...e("a1", "b1", "data", "write"), id: "a1->b1#2" },
    e("a1", "b2", "call", "ask"),
    e("b2", "a1", "async", "answer"),
    e("b1", "b2", "call"),
    e("b2", "b3", "data", "post"),
    e("b1", "b3", "data", "copy"),
    e("a1", "c1", "async", "publish"),
    e("c1", "a2", "async"),
    e("a2", "b1", "data"),
    e("a2", "b3", "data"),
    e("a2", "c1", "data"),
  ],
};

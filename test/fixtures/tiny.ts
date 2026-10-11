// The smallest useful diagram: 3 layers, 5 nodes, one alignment that holds.

import type { Diagram } from "../../src/model/types.ts";
import { e, n } from "./build.ts";

export const tiny: Diagram = {
  grafical: 1,
  title: "Tiny",
  density: "normal",
  layers: [
    { id: "callers", label: "Callers", nodes: [n("web", "web app", "actor", "m")] },
    {
      id: "services",
      label: "Services",
      nodes: [
        n("api", "orders-api", "service", "m", { sublabel: ":8080", accent: true }),
        n("worker", "orders-worker", "service", "m"),
      ],
    },
    {
      id: "storage",
      label: "Storage",
      nodes: [
        n("db", "orders db", "store", "l", { align: "api" }),
        n("queue", "order events", "queue", "s"),
      ],
    },
  ],
  edges: [
    e("web", "api", "call", "HTTPS"),
    e("api", "db", "data", "write"),
    e("api", "queue", "async", "publish"),
    e("queue", "worker", "async", "consume"),
    e("worker", "db", "data"),
  ],
};

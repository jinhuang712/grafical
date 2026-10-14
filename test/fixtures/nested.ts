// Groups inside groups (DESIGN.md, "Every layered diagram type"): a fictional shop deployed in one cloud region, whose
// network holds a public and a private subnet. Three levels, the most allowed, with
// nodes outside every group above and beside them.

import type { Diagram } from "../../src/model/types.ts";
import { e, n } from "./build.ts";

export const nested: Diagram = {
  grafical: 1,
  title: "Shop deployment",
  subtitle: "One region; the web tier in a public subnet, everything else private.",
  density: "normal",
  layers: [
    {
      id: "edge",
      label: "Edge",
      nodes: [
        n("users", "shoppers", "actor", "m", { sublabel: "web and mobile" }),
        n("cdn", "CDN", "external", "m", { sublabel: "static files" }),
      ],
    },
    {
      id: "web",
      label: "Web",
      nodes: [
        n("lb", "load balancer", "service", "m", { group: "public" }),
        n("servers", "web servers", "service", "m", { sublabel: "3 instances", group: "public" }),
      ],
    },
    {
      id: "app",
      label: "Application",
      nodes: [
        n("api", "orders API", "service", "m", { group: "private" }),
        n("worker", "fulfilment worker", "service", "m", { group: "private" }),
      ],
    },
    {
      id: "data",
      label: "Data",
      nodes: [
        n("db", "orders db", "store", "m", { sublabel: "primary", group: "private" }),
        n("queue", "order events", "queue", "m", { group: "private" }),
        n("backup", "backups", "store", "m", { sublabel: "object storage", group: "region" }),
      ],
    },
  ],
  groups: [
    { id: "region", label: "eu-west" },
    { id: "vpc", label: "shop network", in: "region" },
    { id: "public", label: "public subnet", in: "vpc" },
    { id: "private", label: "private subnet", in: "vpc" },
  ],
  edges: [
    e("users", "cdn", "call", "pages"),
    e("users", "lb", "call", "HTTPS"),
    e("lb", "servers", "call"),
    e("servers", "api", "call"),
    e("api", "db", "data", "write"),
    e("api", "queue", "async", "publish"),
    e("queue", "worker", "async", "consume"),
    e("worker", "db", "data"),
    e("db", "backup", "async", "nightly"),
  ],
};

// Every line look (D8, D33): calls and data reads solid, messages dashed, an
// optional read dotted, a two-way read and write, and a link with no arrowhead
// between two related stores.

import type { Diagram } from "../../src/model/types.ts";
import { e, n } from "./build.ts";

export const edgeLooks: Diagram = {
  grafical: 1,
  title: "Photo sharing",
  density: "normal",
  layers: [
    { id: "callers", label: "Callers", nodes: [n("web", "web app", "actor", "m")] },
    { id: "entry", label: "Entry", nodes: [n("api", "photo-api", "service", "m")] },
    {
      id: "core",
      label: "Core",
      nodes: [
        n("uploads", "upload events", "queue", "m"),
        n("thumbs", "thumbnailer", "service", "m"),
      ],
    },
    {
      id: "storage",
      label: "Storage",
      nodes: [
        n("cache", "Redis", "store", "m"),
        n("photos", "photos db", "store", "m"),
        n("cdn", "CDN", "external", "m"),
      ],
    },
  ],
  edges: [
    e("web", "api", "call", "HTTPS"),
    e("api", "uploads", "async", "publish"),
    e("uploads", "thumbs", "async", "consume"),
    e("api", "photos", "data", "write"),
    { ...e("thumbs", "photos", "data", "read, write"), both: true },
    e("api", "cache", "optional", "warm reads"),
    e("photos", "cdn", "link", "mirrors"),
  ],
};

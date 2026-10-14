// The target picture bench/targets/catalog-sync-grouped.png as facts: 15 nodes, 16
// edges, two groups that span rows, a subtitle and a footnote. The engine must
// draw it as uncluttered as the hand-drawn target (DESIGN.md, "A target picture with measured rules").

import type { Diagram } from "../../src/model/types.ts";
import { e, n } from "./build.ts";

const sync = "catalog-sync";
const api = "catalog-api";

export const catalogSyncGrouped: Diagram = {
  grafical: 1,
  title: "catalog-sync and catalog-api",
  subtitle: "Two Go services coupled only by the shared MongoDB catalog database.",
  note: "Not shown: the retry runner and its DLQ, full-load jobs, Redis and auth-svc.",
  density: "normal",
  layers: [
    {
      id: "sources",
      label: "Sources and callers",
      nodes: [
        n("upstream", "upstream topics", "queue", "m", { sublabel: "6 broker topics" }),
        n("callers", "API callers", "actor", "m", { sublabel: "storefront, promotions" }),
      ],
    },
    {
      id: "entry",
      label: "Entry points",
      nodes: [
        n("admin", "admin HTTP", "service", "m", { sublabel: ":7102, operators", group: sync }),
        n("relay", "catalog-relay", "service", "m", { sublabel: "tier 1, :7101", group: sync }),
      ],
    },
    {
      id: "topics",
      label: "Topics and handlers",
      nodes: [
        n("retry", "catalog_retry_v1", "queue", "m", { sublabel: "re-sent when due", group: sync }),
        n("line_topics", "line topics", "queue", "m", {
          sublabel: "goods_v1, tickets_v1",
          group: sync,
        }),
        n("handlers", "API handlers", "service", "m", {
          sublabel: "gRPC, HTTP, no auth",
          group: api,
        }),
      ],
    },
    {
      id: "work",
      label: "Processing",
      nodes: [
        n("pipelines", "line pipelines", "service", "m", {
          sublabel: "goods 10, tickets 20",
          group: sync,
        }),
        n("mongo", "MongoDB catalog", "store", "m", {
          sublabel: "goods_*, ticket_*",
          accent: true,
        }),
        n("service", "service, repo", "service", "m", {
          sublabel: "assemble, Find only",
          group: api,
        }),
      ],
    },
    {
      id: "deps",
      label: "Stores and dependencies",
      nodes: [
        n("geo", "geo-svc", "external", "m", { sublabel: "region tree" }),
        n("postgres", "Postgres replicas", "store", "m", { sublabel: "goods, tickets" }),
        n("i18n", "i18n-svc", "external", "m", { sublabel: "translated text" }),
        n("inventory", "inventory", "store", "m", { sublabel: "MongoDB, stock" }),
        n("campaign", "campaign-svc", "external", "m", { sublabel: "campaign tags" }),
      ],
    },
  ],
  groups: [
    { id: sync, label: "catalog-sync" },
    { id: api, label: "catalog-api" },
  ],
  edges: [
    e("upstream", "relay", "async", "consume"),
    e("relay", "line_topics", "async", "by line"),
    e("line_topics", "pipelines", "async"),
    e("callers", "handlers", "call"),
    e("handlers", "service", "call"),
    e("admin", "line_topics", "async", "resync"),
    e("pipelines", "retry", "async", "failed"),
    e("retry", "line_topics", "async"),
    e("pipelines", "mongo", "call", "persist"),
    e("service", "mongo", "call", "Find"),
    e("pipelines", "postgres", "call"),
    e("pipelines", "geo", "call"),
    e("pipelines", "i18n", "call"),
    e("service", "inventory", "call"),
    e("service", "campaign", "call"),
    e("service", "i18n", "call"),
  ],
};

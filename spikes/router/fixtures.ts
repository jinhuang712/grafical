// Hand-written diagram of the public brief bench/briefs/catalog-sync.md.
// Write side on the left, read side on the right, shared MongoDB at the bottom.

import { type Diagram, type DiagramNode, e, type Layer } from "./model.js";

export const catalogSync: Diagram = {
  title: "catalog-sync and catalog-api",
  density: "normal",
  layers: [
    {
      id: "upstream",
      label: "Upstream and callers",
      nodes: [
        { id: "inventory", label: "inventory-svc", kind: "external", size: "s" },
        { id: "pricing", label: "pricing-svc", kind: "external", size: "s" },
        { id: "merchant", label: "merchant-portal", kind: "external", size: "m" },
        { id: "operators", label: "operators", sublabel: "ops, resync", kind: "actor", size: "s" },
        { id: "promotions", label: "promotions", sublabel: "snapshots", kind: "actor", size: "s" },
        { id: "storefront", label: "storefront", kind: "actor", size: "s" },
      ],
    },
    {
      id: "topics",
      label: "Upstream topics",
      nodes: [
        {
          id: "goods_topics",
          label: "goods change topics",
          sublabel: "Item, Variant, Offer",
          kind: "queue",
          size: "l",
        },
        {
          id: "ticket_topics",
          label: "ticket topics",
          sublabel: "SearchIndex, listing",
          kind: "queue",
          size: "m",
        },
        {
          id: "upstream_change",
          label: "UpstreamChangeTopic",
          sublabel: "name not final",
          kind: "queue",
          size: "l",
        },
      ],
    },
    {
      id: "entry",
      label: "Entry points",
      nodes: [
        {
          id: "relay",
          label: "catalog-relay",
          sublabel: "tier 1, :7101",
          kind: "service",
          size: "m",
        },
        { id: "admin", label: "admin HTTP", sublabel: "sync :7102", kind: "service", size: "m" },
        {
          id: "grpc",
          label: "CatalogApiService",
          sublabel: "gRPC :7190",
          kind: "service",
          size: "m",
          alignWith: "promotions",
        },
        { id: "http", label: "catalog-api HTTP", sublabel: ":8080", kind: "service", size: "m" },
      ],
    },
    {
      id: "kafka",
      label: "Kafka",
      nodes: [
        { id: "goods_v1", label: "catalog_goods_v1", kind: "queue", size: "m" },
        { id: "tickets_v1", label: "catalog_tickets_v1", kind: "queue", size: "m" },
        { id: "retry_v1", label: "catalog_retry_v1", kind: "queue", size: "m" },
      ],
    },
    {
      id: "processing",
      label: "Processing",
      nodes: [
        {
          id: "goods_pipe",
          label: "goods pipeline",
          sublabel: "line 10",
          kind: "service",
          size: "m",
          alignWith: "goods_v1",
        },
        {
          id: "tickets_pipe",
          label: "tickets pipeline",
          sublabel: "line 20",
          kind: "service",
          size: "m",
        },
        { id: "retry_runner", label: "retry runner", kind: "service", size: "m" },
        {
          id: "full_load",
          label: "full-load job",
          sublabel: "external trigger",
          kind: "service",
          size: "m",
        },
        {
          id: "api_service",
          label: "catalog-api service",
          sublabel: "assembly",
          kind: "service",
          size: "l",
          alignWith: "http",
        },
      ],
    },
    {
      id: "stores",
      label: "Stores and dependencies",
      nodes: [
        { id: "auth", label: "auth-svc", kind: "external", size: "s" },
        { id: "geo", label: "geo-svc", kind: "external", size: "s" },
        {
          id: "postgres",
          label: "Postgres replicas",
          sublabel: "read-only",
          kind: "store",
          size: "m",
        },
        { id: "redis", label: "Redis", sublabel: "name cache", kind: "store", size: "s" },
        {
          id: "mongo_control",
          label: "Mongo control",
          sublabel: "dlq, retry, jobs",
          kind: "store",
          size: "m",
        },
        {
          id: "mongo_catalog",
          label: "MongoDB catalog",
          sublabel: "goods_*, ticket_*",
          kind: "store",
          size: "l",
        },
        { id: "i18n", label: "i18n-svc", kind: "external", size: "s" },
        {
          id: "mongo_inventory",
          label: "Mongo inventory",
          sublabel: "stock",
          kind: "store",
          size: "m",
        },
        { id: "campaign", label: "campaign-svc", kind: "external", size: "s" },
      ],
    },
  ],
  edges: [
    e("inventory", "goods_topics", "async", "publish"),
    e("pricing", "goods_topics", "async"),
    e("merchant", "goods_topics", "async"),
    e("goods_topics", "relay", "async", "consume"),
    e("ticket_topics", "relay", "async"),
    e("upstream_change", "relay", "async"),
    e("operators", "admin", "call", "resync, ops"),
    e("promotions", "grpc", "call", "snapshots"),
    e("storefront", "grpc", "call"),
    e("storefront", "http", "call", "GET"),
    e("relay", "goods_v1", "async", "line:id"),
    e("relay", "tickets_v1", "async"),
    e("admin", "auth", "call", "auth check"),
    e("admin", "goods_v1", "async", "resync"),
    e("admin", "full_load", "call", "run"),
    e("admin", "mongo_control", "data", "dlq ops"),
    e("goods_v1", "goods_pipe", "async", "consume"),
    e("tickets_v1", "tickets_pipe", "async", "consume"),
    e("goods_pipe", "goods_v1", "async", "fanout"),
    e("goods_pipe", "retry_v1", "async", "failed"),
    e("tickets_pipe", "retry_v1", "async"),
    e("retry_v1", "retry_runner", "async"),
    e("retry_runner", "goods_v1", "async", "redrive"),
    e("retry_runner", "tickets_v1", "async"),
    e("retry_runner", "mongo_control", "data", "dlq after 5"),
    e("full_load", "postgres", "data", "scan"),
    e("full_load", "goods_v1", "async", "seed"),
    e("full_load", "mongo_control", "data", "job state"),
    e("goods_pipe", "postgres", "data", "fetch"),
    e("goods_pipe", "redis", "data"),
    e("goods_pipe", "geo", "call", "regions"),
    e("goods_pipe", "i18n", "call"),
    e("goods_pipe", "mongo_catalog", "data", "persist"),
    e("tickets_pipe", "postgres", "data"),
    e("tickets_pipe", "mongo_catalog", "data"),
    e("grpc", "api_service", "call"),
    e("http", "api_service", "call"),
    e("api_service", "mongo_catalog", "data", "Find"),
    e("api_service", "mongo_inventory", "data", "stock"),
    e("api_service", "campaign", "call", "tags"),
    e("api_service", "i18n", "call", "text"),
  ],
};

/** Single edges that the stability test adds one at a time. */
export const addedEdges = [
  e("tickets_pipe", "i18n", "call", "text"),
  e("tickets_pipe", "redis", "data"),
  e("promotions", "http", "call", "GET"),
  e("admin", "mongo_catalog", "data", "correction"),
  e("relay", "upstream_change", "async"),
];

// A denser variant of about 50 nodes: the same diagram with the Mongo collections
// and the admin routes spelled out as nodes.
function extraNodes(prefix: string, labels: string[], kind: DiagramNode["kind"]): DiagramNode[] {
  return labels.map((label) => ({ id: `${prefix}_${label}`, label, kind, size: "m" as const }));
}

const goodsCollections = [
  "goods_category",
  "goods_region",
  "goods_tag",
  "goods_item",
  "goods_variant",
  "goods_offer",
  "goods_media",
  "item_content",
  "variant_content",
];
const ticketCollections = ["ticket_listings", "ticket_backfill"];
const snapshotCollections = ["item_snapshot", "variant_snapshot", "offer_snapshot"];
const adminRoutes = ["correction", "dlq", "backfill", "tickets ops", "goods ops", "debug"];

function denseLayers(): Layer[] {
  const layers = catalogSync.layers.map((l) => ({ ...l, nodes: [...l.nodes] }));
  const collections: Layer = {
    id: "collections",
    label: "Mongo collections",
    nodes: [
      ...extraNodes("col", goodsCollections, "store"),
      ...extraNodes("snap", snapshotCollections, "store"),
      ...extraNodes("tcol", ticketCollections, "store"),
    ],
  };
  const entry = layers.find((l) => l.id === "entry");
  if (entry === undefined) throw new Error("fixture: no entry layer");
  entry.nodes.splice(2, 0, ...extraNodes("route", adminRoutes, "service"));
  // The admin routes push the read side to the right, so grpc can no longer align.
  entry.nodes = entry.nodes.map((n) => {
    if (n.id !== "grpc") return n;
    const { alignWith: _, ...rest } = n;
    return rest;
  });
  return [...layers, collections];
}

function denseEdges(): Diagram["edges"] {
  const edges = [...catalogSync.edges];
  for (const route of adminRoutes) edges.push(e("admin", `route_${route}`, "call"));
  edges.push(e("route_correction", "goods_v1", "async", "re-produce"));
  edges.push(e("route_dlq", "mongo_control", "data"));
  edges.push(e("route_backfill", "tickets_v1", "async"));
  for (const c of goodsCollections) edges.push(e("goods_pipe", `col_${c}`, "data"));
  for (const c of snapshotCollections) edges.push(e("goods_pipe", `snap_${c}`, "data"));
  for (const c of ["goods_item", "goods_variant", "goods_offer"])
    edges.push(e("api_service", `col_${c}`, "data", "Find"));
  for (const c of snapshotCollections) edges.push(e("api_service", `snap_${c}`, "data"));
  for (const c of ticketCollections) edges.push(e("tickets_pipe", `tcol_${c}`, "data"));
  return edges;
}

export const catalogSyncDense: Diagram = {
  ...catalogSync,
  title: "catalog-sync and catalog-api, dense",
  layers: denseLayers(),
  edges: denseEdges(),
};

// A dense variant of catalog-sync: 50 nodes and 70 edges. The admin routes and the
// Mongo collections are spelled out as nodes, as in the phase 0 router spike.

import type { Diagram, DiagramNode, Edge, Layer } from "../../src/model/types.ts";
import { e, n } from "./build.ts";
import { catalogSync } from "./catalog-sync.ts";

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
const snapshotCollections = ["item_snapshot", "variant_snapshot", "offer_snapshot"];
const ticketCollections = ["ticket_listings", "ticket_backfill"];
const adminRoutes = ["correction", "dlq", "backfill", "tickets ops", "goods ops", "debug"];

const slug = (s: string) => s.replace(/ /g, "_");

function nodes(prefix: string, labels: string[], kind: DiagramNode["kind"]): DiagramNode[] {
  return labels.map((label) => n(`${prefix}_${slug(label)}`, label, kind, "m"));
}

/** The nodes with these ids, in this order. */
function pick(all: DiagramNode[], ids: string[]): DiagramNode[] {
  return ids.map((id) => {
    const node = all.find((x) => x.id === id);
    if (node === undefined) throw new Error(`fixture: no node ${id}`);
    return node;
  });
}

// The admin routes sit around admin. The collections that only the goods pipeline
// writes come first, then the ticket collections under the tickets pipeline, then
// the ones catalog-api reads, then the snapshots.
function layers(): Layer[] {
  const out = catalogSync.layers.map((l) => ({ ...l, nodes: [...l.nodes] }));
  const entry = out.find((l) => l.id === "entry");
  if (entry === undefined) throw new Error("fixture: no entry layer");
  const routes = nodes("route", adminRoutes, "service");
  const [admin, ...rest] = entry.nodes;
  if (admin === undefined) throw new Error("fixture: empty entry layer");
  entry.nodes = [
    ...pick(routes, ["route_dlq"]),
    admin,
    ...pick(routes, [
      "route_tickets_ops",
      "route_goods_ops",
      "route_debug",
      "route_correction",
      "route_backfill",
    ]),
    ...rest,
  ];
  const collections = [
    ...nodes("tcol", ticketCollections, "store"),
    ...nodes("col", goodsCollections, "store"),
    ...nodes("snap", snapshotCollections, "store"),
  ];
  out.push({
    id: "collections",
    label: "Mongo collections",
    nodes: pick(collections, [
      "col_goods_category",
      "col_goods_region",
      "col_goods_tag",
      "col_goods_media",
      "col_item_content",
      "col_variant_content",
      "tcol_ticket_listings",
      "tcol_ticket_backfill",
      "col_goods_item",
      "col_goods_variant",
      "col_goods_offer",
      "snap_item_snapshot",
      "snap_variant_snapshot",
      "snap_offer_snapshot",
    ]),
  });
  return out;
}

function edges(): Edge[] {
  const out = [...catalogSync.edges];
  for (const r of adminRoutes) out.push(e("admin", `route_${slug(r)}`, "call"));
  out.push(e("route_correction", "goods_v1", "async", "re-produce"));
  out.push(e("route_dlq", "mongo_control", "data"));
  out.push(e("route_backfill", "tickets_v1", "async"));
  for (const c of goodsCollections) out.push(e("goods_pipe", `col_${c}`, "data"));
  for (const c of snapshotCollections) out.push(e("goods_pipe", `snap_${c}`, "data"));
  for (const c of ["goods_item", "goods_variant", "goods_offer"]) {
    out.push(e("api_service", `col_${c}`, "data", "Find"));
  }
  for (const c of snapshotCollections) out.push(e("api_service", `snap_${c}`, "data"));
  for (const c of ticketCollections) out.push(e("tickets_pipe", `tcol_${c}`, "data"));
  return out;
}

export const dense: Diagram = {
  ...catalogSync,
  title: "catalog-sync and catalog-api, dense",
  layers: layers(),
  edges: edges(),
};

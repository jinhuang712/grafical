// Swimlanes (DESIGN.md, "Swimlanes run one way"): a checkout system drawn by owner as row lanes, every
// row in a lane (the owner chose a lane of its own for the stores, 2026-10-12),
// and by team as column lanes, with nodes outside every lane and an edge to a lane.
// Fictional systems. Boxes are sized by grafical (DESIGN.md, "Boxes sized to their text").

import type { Diagram, DiagramNode, NodeKind } from "../../src/model/types.ts";
import { e } from "./build.ts";

function node(id: string, label: string, kind: NodeKind, lane?: string): DiagramNode {
  return lane === undefined ? { id, label, kind } : { id, label, kind, lane };
}

export const lanesRows: Diagram = {
  grafical: 1,
  title: "Checkout, by owner",
  density: "normal",
  layers: [
    {
      id: "clients",
      label: "Clients",
      lane: "customer",
      nodes: [node("web", "web shop", "actor"), node("mobile", "mobile app", "actor")],
    },
    {
      id: "edge",
      label: "Edge",
      lane: "platform",
      nodes: [node("gateway", "api gateway", "service")],
    },
    {
      id: "services",
      label: "Services",
      lane: "platform",
      nodes: [node("orders", "orders-api", "service"), node("catalog", "catalog-api", "service")],
    },
    {
      id: "money",
      label: "Money",
      lane: "pay",
      nodes: [node("payments", "payments-api", "service"), node("ledger", "ledger", "store")],
    },
    {
      id: "data",
      label: "Data",
      lane: "stores",
      nodes: [node("ordersdb", "orders db", "store"), node("events", "order events", "queue")],
    },
  ],
  lanes: [
    { id: "customer", label: "Customer" },
    { id: "platform", label: "Platform team" },
    { id: "pay", label: "Payments team" },
    { id: "stores", label: "Data stores" },
  ],
  edges: [
    e("web", "gateway", "call", "HTTPS"),
    e("mobile", "gateway", "call", "HTTPS"),
    e("gateway", "orders", "call"),
    e("gateway", "catalog", "call"),
    e("orders", "payments", "call", "charge"),
    e("payments", "ledger", "data"),
    e("orders", "ordersdb", "data"),
    e("orders", "events", "async", "publish"),
  ],
};

export const lanesColumns: Diagram = {
  grafical: 1,
  title: "Checkout, by team",
  density: "normal",
  layers: [
    {
      id: "entry",
      label: "Entry",
      nodes: [node("web", "web shop", "actor", "webteam"), node("ops", "on-call", "actor")],
    },
    {
      id: "services",
      label: "Services",
      nodes: [
        node("bff", "storefront bff", "service", "webteam"),
        node("orders", "orders-api", "service", "orderteam"),
        node("payments", "payments-api", "service", "payteam"),
        node("fraud", "fraud check", "external"),
      ],
    },
    {
      id: "data",
      label: "Data",
      nodes: [
        node("ordersdb", "orders db", "store", "orderteam"),
        node("ledger", "ledger", "store", "payteam"),
      ],
    },
  ],
  lanes: [
    { id: "webteam", label: "Web team" },
    { id: "orderteam", label: "Orders team" },
    { id: "payteam", label: "Payments team" },
  ],
  edges: [
    e("web", "bff", "call", "HTTPS"),
    e("bff", "orders", "call"),
    e("orders", "ordersdb", "data"),
    e("orders", "payments", "call", "charge"),
    e("payments", "ledger", "data"),
    e("payments", "fraud", "call"),
    e("ops", "payteam", "call", "pages"),
  ],
};

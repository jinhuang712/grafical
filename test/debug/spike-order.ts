// catalog-sync with the node orders of the phase 0 router spike, for a like-for-like
// comparison of route measures. Run: node test/debug/spike-order.ts

import { layout, routeStats } from "../../src/layout/index.ts";
import type { Diagram } from "../../src/model/types.ts";
import { createStubMeasurer } from "../../src/text/stub.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { defects, mechanical } from "../layout/checks.ts";

const spikeOrders: Record<string, string[]> = {
  upstream: ["inventory", "pricing", "merchant", "operators", "promotions", "storefront"],
  topics: ["goods_topics", "ticket_topics", "upstream_change"],
  entry: ["relay", "admin", "grpc", "http"],
  kafka: ["goods_v1", "tickets_v1", "retry_v1"],
  processing: ["goods_pipe", "tickets_pipe", "retry_runner", "full_load", "api_service"],
  stores: [
    "auth",
    "geo",
    "postgres",
    "redis",
    "mongo_control",
    "mongo_catalog",
    "i18n",
    "mongo_inventory",
    "campaign",
  ],
};

export const spikeOrder: Diagram = {
  ...catalogSync,
  layers: catalogSync.layers.map((l) => ({
    ...l,
    nodes: (spikeOrders[l.id] ?? []).map((id) => {
      const n = l.nodes.find((x) => x.id === id);
      if (n === undefined) throw new Error(id);
      return n;
    }),
  })),
};

if (import.meta.main) {
  const s = layout(spikeOrder, createStubMeasurer());
  const st = routeStats(s.edges.map((e) => e.points));
  console.log(`spike order: crossings ${st.crossings}, bends ${st.bends}, length ${st.length}`);
  console.log(mechanical(defects(s)));
}

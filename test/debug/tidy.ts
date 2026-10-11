// Explores node orders: moves single nodes while the real router's crossing count
// drops, and prints each move. Run: node test/debug/tidy.ts <fixture> [layer...]

import { chooseSlot, layout, routeStats } from "../../src/layout/index.ts";
import type { Diagram } from "../../src/model/types.ts";
import { createStubMeasurer } from "../../src/text/stub.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { dense } from "../fixtures/dense.ts";

const m = createStubMeasurer();
const fixtures: Record<string, Diagram> = { "catalog-sync": catalogSync, dense };
let d = fixtures[process.argv[2] ?? ""] ?? catalogSync;
const only = process.argv.slice(3);
const crossings = (x: Diagram) => routeStats(layout(x, m).edges.map((e) => e.points)).crossings;
let best = crossings(d);
console.log(`start: ${best}`);
for (let pass = 0; pass < 4; pass++) {
  let moved = false;
  for (const layer of d.layers) {
    if (only.length > 0 && !only.includes(layer.id)) continue;
    for (const node of [...layer.nodes]) {
      const slot = chooseSlot(d, layer.id, node.id, m);
      const cur = d.layers.find((l) => l.id === layer.id);
      if (cur === undefined) continue;
      const rest = cur.nodes.filter((x) => x.id !== node.id);
      const nodes = [...rest.slice(0, slot), node, ...rest.slice(slot)];
      const trial = {
        ...d,
        layers: d.layers.map((l) => (l.id === layer.id ? { ...l, nodes } : l)),
      };
      const c = crossings(trial);
      if (c < best) {
        console.log(`${layer.id}: ${node.id} -> slot ${slot}: ${best} -> ${c}`);
        best = c;
        d = trial;
        moved = true;
      }
    }
  }
  if (!moved) break;
}
for (const l of d.layers) console.log(`${l.id}: ${l.nodes.map((x) => x.id).join(", ")}`);

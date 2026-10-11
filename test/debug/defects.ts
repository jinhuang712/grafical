// Prints the geometry checks for every fixture. Run: node test/debug/defects.ts

import { layout } from "../../src/layout/index.ts";
import { createStubMeasurer } from "../../src/text/stub.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { dense } from "../fixtures/dense.ts";
import { edgeCases } from "../fixtures/edge-cases.ts";
import { tiny } from "../fixtures/tiny.ts";
import { defects, mechanical } from "../layout/checks.ts";

const m = createStubMeasurer();
for (const [name, d] of Object.entries({
  tiny,
  "edge-cases": edgeCases,
  "catalog-sync": catalogSync,
  dense,
})) {
  const list = mechanical(defects(layout(d, m)));
  console.log(`${name}: ${list.length}`);
  for (const x of list) console.log(`  ${x}`);
}

// Text measurement entry point. The real measurer loads the bundled fonts
// through harfbuzzjs (DESIGN.md D12). Until it lands, this returns the stub.

import { createStubMeasurer } from "./stub.ts";
import type { Measurer } from "./types.ts";

export { createStubMeasurer } from "./stub.ts";
export type { FontFace, Line, Measurer, Run, TextMetrics, TextStyle } from "./types.ts";

export async function createMeasurer(): Promise<Measurer> {
  return createStubMeasurer();
}

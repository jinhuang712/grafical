// Text measurement entry point (DESIGN.md, "Bundled fonts"). The real measurer shapes the
// bundled fonts with harfbuzzjs. The stub stays for tests that need no fonts.

import { loadFontBytes } from "./fonts.ts";
import { createHarfbuzzMeasurer } from "./measurer.ts";
import type { Measurer } from "./types.ts";

export { FONT_FAMILY, FONT_FILES } from "./fonts.ts";
export { createHarfbuzzMeasurer } from "./measurer.ts";
export { createStubMeasurer } from "./stub.ts";
export type { FontFace, Line, Measurer, Run, TextMetrics, TextStyle } from "./types.ts";

export async function createMeasurer(): Promise<Measurer> {
  return createHarfbuzzMeasurer(loadFontBytes());
}

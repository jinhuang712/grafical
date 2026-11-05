// Text measurement entry point (specs/decisions, "Bundled fonts"). The real measurer shapes the
// bundled fonts with harfbuzzjs. The stub stays for tests that need no fonts.

import { loadFontBytes } from "./fonts.ts";
import { createHarfbuzzMeasurer } from "./measurer.ts";
import type { Measurer } from "./types.ts";

export { FONT_FAMILY, FONT_FILES } from "./fonts.ts";
export { createHarfbuzzMeasurer } from "./measurer.ts";
export { createStubMeasurer } from "./stub.ts";
export type { FontFace, Line, Measurer, Run, TextMetrics, TextStyle } from "./types.ts";

let shared: Measurer | undefined;

/**
 * The one measurer of a process. harfbuzzjs 1.6.3 frees nothing, so a measurer per write runs its memory out after a
 * few hundred, and a measurer gives the same sizes whichever texts it measured before.
 */
export async function createMeasurer(): Promise<Measurer> {
  shared ??= createHarfbuzzMeasurer(loadFontBytes());
  return shared;
}

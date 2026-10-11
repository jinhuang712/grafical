// Font file loader for the PNG path: Node only (DESIGN.md D19).
// The text worker also adds FONT_FILES in src/text/fonts.ts. Unify the two
// when both land: this list should then import from there.

import { fileURLToPath } from "node:url";

const dir = new URL("../../fonts/", import.meta.url);

export const RENDER_FONT_FILES: string[] = [
  "Inter-Regular.ttf",
  "Inter-SemiBold.ttf",
  "NotoSansSC-Regular.ttf",
  "NotoSansSC-SemiBold.ttf",
].map((name) => fileURLToPath(new URL(name, dir)));

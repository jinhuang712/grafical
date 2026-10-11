import { readFileSync } from "node:fs";

const dir = new URL("../../fonts/", import.meta.url);

export type Weight = 400 | 600;

/** The four bundled font files, in the order resvg loads them. */
export const fontFiles = [
  "Inter-Regular.ttf",
  "Inter-SemiBold.ttf",
  "NotoSansSC-Regular.ttf",
  "NotoSansSC-SemiBold.ttf",
].map((name) => new URL(name, dir).pathname);

export const fontPath = {
  latin: { 400: fontFiles[0] as string, 600: fontFiles[1] as string },
  hanzi: { 400: fontFiles[2] as string, 600: fontFiles[3] as string },
} as const;

export const fontBytes = (path: string): Uint8Array => new Uint8Array(readFileSync(path));

/** The CSS font stack the SVG uses: Inter first, Noto Sans SC for what Inter cannot draw. */
export const fontFamily = "Inter, 'Noto Sans SC'";

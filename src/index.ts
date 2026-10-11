// grafical's library surface. The command line in src/cli is built on it.

export { check, measureTaste, type TasteReport, type TasteRule } from "./check/index.ts";
export type { Defect, DefectCode, OpError } from "./errors.ts";
export { chooseSlot, layout } from "./layout/index.ts";
export * from "./model/types.ts";
export { renderPng, renderSvg } from "./render/index.ts";
export type * from "./scene.ts";
export { createMeasurer, createStubMeasurer } from "./text/index.ts";
export type * from "./text/types.ts";

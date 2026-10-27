export * from "./ripple";
export * from "./ripple-core";
// The browser entry keeps its CSS timing API; /core exports the semantic defaults instead.
export { DEFAULT_RIPPLE_TIMING } from "./ripple";
export type { RippleTiming } from "./ripple";

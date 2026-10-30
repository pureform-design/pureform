// Browser-facing animation APIs, wrapping animate-core with drivers that run on CSS first.
// Applications import this adapter, not core.
export { STAGGER_DELAY_VAR, stagger } from "./stagger";
export type { Stagger, StaggerOptions } from "./stagger";

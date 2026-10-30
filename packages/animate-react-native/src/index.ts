// React Native animation APIs, wrapping animate-core with drivers that choose the fastest path
// the engine has. Applications import this adapter, not core.
export { stagger } from "./stagger";
export type { Stagger, StaggerOptions } from "./stagger";

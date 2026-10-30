// Platform-neutral animation coordination. Consumers import `@pureform/animate-web` or
// `@pureform/animate-react-native`, not this package.
export { staggerDelays } from "./stagger";
export type { StaggerCurve, StaggerOptions } from "./stagger";
export { staggerOnSpring } from "./spring-stagger";
export type { SpringStagger, SpringStaggerOptions } from "./spring-stagger";

// React Native animation APIs, wrapping animate-core with drivers that choose the fastest path
// the engine has. Applications import this adapter, not core.
export { stagger } from "./stagger";
export type { Stagger, StaggerOptions } from "./stagger";
export { channelAt } from "@pureform/animate-core";
export type {
    MotionChannel,
    MotionClock,
    MotionTimeline,
} from "@pureform/animate-core";

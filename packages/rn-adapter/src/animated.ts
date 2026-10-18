// The animated entry, the one that imports React Native: animated styles for a component's
// transitions and keyframe animations, press ripples, and overlays' enter and exit.

export { useAnimatedComponentStyles } from "./animate/styles";
export { curve } from "./animate/curve";
export { animatedPresence } from "./animate/presence";
export { useRipple } from "./animate/ripple";
export type { RippleOptions, Ripples } from "./animate/ripple";
export { presenceFrames } from "./motion";
export type {
    PresenceDriver,
    PresenceFrame,
    PresenceMotion,
    PresencePhase,
    PresenceStep,
    PresenceView,
} from "./motion";
export type { State, Style } from "./select";

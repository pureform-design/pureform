// The animated entry, the one that imports React Native: animated styles for a component's
// transitions and keyframe animations, press ripples, overlays' enter and exit, and an active
// indicator's slide.

export { useAnimatedComponentStyles } from "./animate/styles";
export { animate, curve, NATIVE_DRIVER } from "./animate/curve";
export type { AnimatedTiming } from "./animate/curve";
export { animatedPresence } from "./animate/presence";
export { settle } from "./animate/settle";
export type { Spring } from "./values";
export { useRipple } from "./animate/ripple";
export { useAnimatedSlide } from "./animate/slide";
export type { RippleOptions, Ripples } from "./animate/ripple";
export {
    offsetSpan,
    presenceFrames,
    slideAt,
    slideOffset,
    slowSpring,
    springProgress,
} from "./motion";
export type {
    SlideMotion,
    SlideOffset,
    Span,
    PresenceDriver,
    PresenceFrame,
    PresenceMotion,
    PresencePhase,
    PresenceStep,
    PresenceTiming,
    PresenceView,
} from "./motion";
export type { State, Style } from "./select";

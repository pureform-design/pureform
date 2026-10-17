// pureform's React Native bindings: the provider, the style registry's hooks, motion engines,
// icons, and what components build on. The components are at their own subpaths
// (`@pureform/react-native/button`, …).

export { animated, pressNow } from "./engine";
export type {
    DrawingProps,
    InkOptions,
    MotionEngine,
    MotionStyles,
} from "./engine";
export {
    Glyph,
    IconSlot,
    iconSlot,
    iconStyleOf,
    ownText,
    useIconStyle,
} from "./icon-style";
export {
    testIdOf,
    unselectable,
    useControllable,
    useInk,
    usePress,
    withEngine,
    withInk,
} from "./parts";
export type { InkSlotOptions, PressHandlers } from "./parts";
export {
    PureformProvider,
    useDirection,
    useEngine,
    useMotion,
    usePureform,
    useRegistry,
} from "./provider";
export type {
    PureformProviderProps,
    PureformState,
    SchemeOverrides,
} from "./provider";
export {
    useComponentSlots,
    useSelectedStyles,
    useStyleFactory,
    useStyles,
} from "./styles";
export type { ComponentSlots } from "./styles";
export {
    PureformContainer,
    useReducedMotion,
    useStyleEnvironment,
    useTokens,
} from "@pureform/rn-adapter/react";
export type { PureformContainerProps } from "@pureform/rn-adapter/react";
export type {
    NativeSelection,
    NativeSlot,
    NativeSlots,
    NativeStyleFactory,
    Overrides,
    Scheme,
} from "@pureform/rn-adapter/factory";
export type {
    ChangeDetails,
    ComponentDefaults,
    Direction,
    IconStyle,
    MotionSetting,
} from "@pureform/binding-core";

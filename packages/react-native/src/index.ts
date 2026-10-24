// pureform's React Native bindings: the provider, the style registry's hooks, motion engines,
// icons, indication and interaction sources, and what components build on. The components are
// at their own subpaths (`@pureform/react-native/button`, …).

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
    DEFAULT_INDICATION,
    materialIndication,
    nativeIndication,
    useIndication,
} from "./indication";
export type { SurfaceIndication, UseIndicationOptions } from "./indication";
export {
    FOCUS_AFTER_PRESS_MS,
    focusFollowsPress,
    useInteractionSource,
    useInteractionState,
} from "./interaction";
export type { PressableEvent, PressableHandlers } from "./interaction";
export { useLayer } from "./layer";
export type { StackingLayer } from "./layer";
export { dismissTopOverlay, placeOverlay, useDismiss } from "./overlay";
export type { PlaceOptions, Placed } from "./overlay";
export { testIdOf, unselectable, useControllable, withEngine } from "./parts";
export {
    backdropKeys,
    nativeSlots,
    overlayKeys,
    withUnselectable,
} from "./slot-props";
export type {
    InnerPropsOf,
    NativeHost,
    NativePartProps,
    NativePartStyle,
    NativeSlotProps,
    PartSlots,
    PartHosts,
} from "./slot-props";
export { Portal } from "./portal";
export { ProvidedTokens, useProvidedTokens } from "./provided-tokens";
export type { PortalProps } from "./portal";
export { PortalHost } from "./portal-host";
export type { OverlayInsets, PortalHostProps, WindowRect } from "./portal-host";
export {
    OVERLAY_KEYFRAMES,
    OVERLAY_MOTIONS,
    overlayMotion,
    usePresence,
} from "./presence";
export type {
    OverlayFrame,
    OverlayMotionName,
    OverlayMotionStep,
    Presence,
} from "./presence";
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
export type { ComponentSlots, SlotViews, SlotViewsBySlot } from "./styles";
export {
    PureformContainer,
    useContainerFrame,
    useMeasureContainer,
    useReducedMotion,
    useStyleEnvironment,
    useTokens,
} from "@pureform/rn-adapter/react";
export type {
    ContainerFrame,
    PureformContainerProps,
} from "@pureform/rn-adapter/react";
export type {
    PresenceDriver,
    PresenceFrame,
    PresenceMotion,
    PresencePhase,
    PresenceStep,
    PresenceView,
} from "@pureform/rn-adapter/animated";
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
export {
    defineIndication,
    noIndication,
} from "@pureform/binding-core/indication";
export type {
    Indication,
    IndicationTokens,
    MaterialIndicationOptions,
    MaterialRipple,
    NativeIndicationComponent,
    NativeIndicationProps,
    NativeIndicationSurface,
} from "@pureform/binding-core/indication";
export type {
    Interaction,
    InteractionKinds,
    InteractionSource,
    InteractionState,
    MutableInteractionSource,
    PointerKind,
} from "@pureform/binding-core/interaction";

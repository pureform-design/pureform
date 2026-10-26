"use client";

// pureform's React bindings: the provider, the style registry's hooks, and what components build
// their parts from. Machines run through `@zag-js/react`'s `useMachine`.

export { useClasses, useClassFactory, useLazyClassFactory } from "./classes";
export { useControllable } from "./controllable";
export type {
    ControllableMachineProps,
    ControllableState,
} from "./controllable";
export { useFieldsetDisabled, useFormReset } from "./form";
export type { FormResetOptions } from "./form";
export { IconPartContext, useIconStyle } from "./icon-style";
export { ProvidedTokens, useProvidedTokens } from "./provided-tokens";
export {
    useIndication,
    useInteractionSource,
    useInteractionState,
} from "./indication";
export type {
    SurfaceIndication,
    SurfaceProps,
    UseIndicationOptions,
} from "./indication";
export { noIndication } from "@pureform/binding-core/indication";
export {
    defineIndication,
    materialIndication,
} from "@pureform/binding-web/indication";
export type {
    Indication,
    IndicationTarget,
} from "@pureform/binding-web/indication";
export type {
    IndicationContext,
    IndicationTokens,
    MaterialIndicationOptions,
    MaterialRipple,
} from "@pureform/binding-core/indication";
export type {
    Interaction,
    InteractionKinds,
    InteractionSource,
    InteractionState,
    MutableInteractionSource,
    PointerKind,
} from "@pureform/binding-core/interaction";
export { useReducedMotion } from "./motion";
export { createPartContext } from "./part-context";
export type { PartContext } from "./part-context";
export { usePresence } from "./presence";
export type { Presence } from "./presence";
export {
    mergeRefs,
    slotPartProps,
    useSlotProps,
    useComponent,
    useUnstyledComponent,
} from "./parts";
export type {
    ComponentOf,
    ComponentOptions,
    ComponentScope,
    PartOptions,
    PartScope,
    RenderOptions,
    CustomizeProps,
    InnerPropsOf,
    SlotKeyedProps,
    SlotPropsOf,
    UnstyledComponentOptions,
} from "./parts";
export { combinePartProps, mergePartProps, mergeStyles } from "./props";
export type { PartProps } from "./props";
export {
    PureformProvider,
    useDirection,
    useMotion,
    usePureform,
    useRegistry,
    useThemeVars,
} from "./provider";
export type { PureformProviderProps, PureformState } from "./provider";
export { preloadTheme } from "@pureform/styling";
export type { RuntimeTheme, ThemeSchemeVars } from "@pureform/styling";

export { cx } from "@pureform/binding-core";
export type {
    ChangeDetails,
    ChangeReason,
    ClassValue,
    Controllable,
    Direction,
    IconStyle,
    ProviderTheme,
    ThemeHydration,
    ThemeOverrides,
    MotionSetting,
    PartStates,
    PerInstance,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";

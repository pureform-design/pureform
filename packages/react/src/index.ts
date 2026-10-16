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
export { useReducedMotion } from "./motion";
export { mergeRefs, slotPartProps, useComponent } from "./parts";
export type {
    ComponentOf,
    ComponentOptions,
    ComponentScope,
    PartOptions,
    RenderOptions,
    SlotKeyedProps,
} from "./parts";
export { combinePartProps, mergePartProps, mergeStyles } from "./props";
export type { PartProps } from "./props";
export {
    PureformProvider,
    useDirection,
    useMotion,
    usePureform,
    useRegistry,
} from "./provider";
export type { PureformProviderProps, PureformState } from "./provider";

export { cx } from "@pureform/binding-core";
export type {
    ChangeDetails,
    ChangeReason,
    ClassValue,
    Controllable,
    Direction,
    IconStyle,
    MotionSetting,
    PartStates,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";

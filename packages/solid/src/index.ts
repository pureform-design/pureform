// pureform's Solid 2 bindings: the provider, the style registry's hooks, and what components build
// their parts from. The Zag.js port is at `@pureform/solid/internal/zag`.

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
export { slotPartProps, useComponent } from "./parts";
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

export type {
    ChangeDetails,
    ChangeReason,
    Controllable,
    Direction,
    IconStyle,
    MotionSetting,
    PartStates,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";

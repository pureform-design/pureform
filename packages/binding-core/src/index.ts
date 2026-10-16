// The framework-free pieces every pureform binding shares: what the provider takes and how nested
// providers combine, selections over defaults, part attributes and props merging, controllable
// state, and reduced motion. DOM-only helpers are at `@pureform/binding-core/dom`.

export {
    controllableNames,
    controlSwitchMessage,
    createChangeReason,
    createControlTracker,
} from "./controllable";
export type {
    ChangeDetails,
    ChangeName,
    ChangeReason,
    ChangeReasonTracker,
    Controllable,
    ControllableNames,
    DefaultName,
} from "./controllable";
export { DEFAULT_ICON_STYLE, sameIconStyle } from "./icon-style";
export type { IconStyle } from "./icon-style";
export {
    MOTION_ATTRIBUTE,
    REDUCED_MOTION_QUERY,
    resolveReducedMotion,
} from "./motion";
export type { MotionSetting } from "./motion";
export {
    forSlot,
    isIconPart,
    isUnstyled,
    partClasses,
    stateAttributes,
} from "./parts";
export type { PartStates, SlotKeyed, StateAttributes, Unstyled } from "./parts";
export { combineProps, mergeStyleObjects } from "./props";
export type { CombineRules } from "./props";
export {
    providerAttributes,
    requireRegistry,
    resolveProvider,
    ROOT_PROVIDER,
} from "./provider";
export type {
    AnyRegistry,
    ComponentDefaults,
    Direction,
    MergePartProps,
    ProviderAttributes,
    ProviderOptions,
    ProviderSlotProps,
    ProviderState,
    ThemeHydration,
    ThemeName,
    ThemeOverrides,
} from "./provider";
export { withDefaults } from "./selection";
export { trainVersionMismatch } from "./version";
export { warnOnce } from "./warn";

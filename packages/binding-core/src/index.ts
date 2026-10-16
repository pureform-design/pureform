// The framework-free pieces every pureform binding shares: what the provider takes and how nested
// providers combine, selections over defaults, part attributes and props merging, controllable
// state, and reduced motion. DOM-only helpers are at `@pureform/binding-core/dom`.

export { cx } from "./class-names";
export type { ClassDictionary, ClassValue } from "./class-names";
export {
    BUTTON_CONTENT_PROPS,
    BUTTON_ROOT_PROPS,
    buttonMachineProps,
    buttonSelection,
} from "./components/button";
export type {
    ButtonBehaviorProps,
    ButtonContentProps,
    ButtonElementIds,
    ButtonPart,
    ButtonRootOwnProps,
    ButtonVariantProps,
} from "./components/button";
export {
    CHECKBOX_INPUT_LABEL_PROPS,
    CHECKBOX_ROOT_PROPS,
    checkboxInputProps,
    checkboxMachineProps,
    checkboxMarkProps,
    checkboxNativeDefault,
    checkboxResetState,
    checkboxSelection,
} from "./components/checkbox";
export type {
    CheckboxBehaviorProps,
    CheckboxElementIds,
    CheckboxPart,
    CheckboxRootOwnProps,
    CheckboxVariantProps,
    CheckedState,
} from "./components/checkbox";
export type { VariantProp } from "./components/variants";
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
    ControllableMachineProps,
    ControllableNames,
    DefaultName,
} from "./controllable";
export {
    classEntry,
    lazyFactoryError,
    serverLazyFactoryMessage,
} from "./entries";
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
    outsideRootMessage,
    partClasses,
    partSources,
    spreadableProps,
    stateAttributes,
} from "./parts";
export type {
    PartSourcesInput,
    PartStates,
    SlotKeyed,
    StateAttributes,
    Unstyled,
} from "./parts";
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
export { selectionSignature, withDefaults } from "./selection";
export { trainVersionMismatch } from "./version";
export { warnOnce } from "./warn";

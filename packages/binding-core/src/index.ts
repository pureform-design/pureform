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
export { CHIP_ROOT_PROPS, chipSelection } from "./components/chip";
export type {
    ChipPart,
    ChipRootOwnProps,
    ChipVariantProps,
} from "./components/chip";
export {
    hasAccessibleName,
    isPresent,
    missingNameMessage,
} from "./components/content";
export type { IconOnlyName } from "./components/content";
export {
    FAB_CONTENT_PROPS,
    FAB_ROOT_PROPS,
    fabMachineProps,
    fabSelection,
} from "./components/fab";
export type {
    FabBehaviorProps,
    FabContentProps,
    FabPart,
    FabRootOwnProps,
    FabVariantProps,
} from "./components/fab";
export {
    ICON_BUTTON_CONTENT_PROPS,
    ICON_BUTTON_ROOT_PROPS,
    iconButtonSelection,
    isToggle,
} from "./components/icon-button";
export type {
    IconButtonContentProps,
    IconButtonPart,
    IconButtonRootOwnProps,
    IconButtonVariantProps,
} from "./components/icon-button";
export {
    RADIO_GROUP_CONTENT_PROPS,
    RADIO_GROUP_ROOT_PROPS,
    RADIO_INPUT_LABEL_PROPS,
    RADIO_PROPS,
    radioGroupMachineProps,
    radioGroupResetValue,
    radioGroupRootProps,
    radioInputProps,
    radioItemProps,
    radioRingProps,
    radioSelection,
} from "./components/radio-group";
export type {
    RadioGroupBehaviorProps,
    RadioGroupContentProps,
    RadioGroupElementIds,
    RadioGroupItem,
    RadioGroupPart,
    RadioGroupRootOwnProps,
    RadioOwnProps,
    RadioPart,
    RadioVariantProps,
} from "./components/radio-group";
export {
    fromZagValue,
    SELECT_COLLECTION,
    SELECT_CONTENT_PROPS,
    SELECT_INPUT_LABEL_PROPS,
    SELECT_ROOT_PROPS,
    selectHiddenSelectProps,
    selectInputProps,
    selectMachineProps,
    selectMenuSelection,
    selectPositionerProps,
    selectSelection,
    selectSupportingTextId,
    selectValueProps,
    toZagValue,
} from "./components/select";
export type {
    SelectBehaviorProps,
    SelectContentProps,
    SelectElementIds,
    SelectItem,
    SelectMenuPart,
    SelectPart,
    SelectPositioning,
    SelectRootOwnProps,
    SelectVariantProps,
} from "./components/select";
export {
    SWITCH_CONTENT_PROPS,
    SWITCH_INPUT_LABEL_PROPS,
    SWITCH_ROOT_PROPS,
    switchInputProps,
    switchMachineProps,
    switchNativeDefault,
    switchSelection,
} from "./components/switch";
export type {
    SwitchBehaviorProps,
    SwitchContentProps,
    SwitchElementIds,
    SwitchPart,
    SwitchRootOwnProps,
    SwitchVariantProps,
} from "./components/switch";
export {
    TEXT_AREA_INPUT_PROPS,
    TEXT_AREA_ROOT_PROPS,
    TEXT_FIELD_CONTENT_PROPS,
    TEXT_FIELD_INPUT_PROPS,
    TEXT_FIELD_ROOT_PROPS,
    textAreaSelection,
    textFieldMachineProps,
    textFieldNativeDefault,
    textFieldSelection,
} from "./components/text-field";
export type {
    TextAreaPart,
    TextAreaRootOwnProps,
    TextAreaVariantProps,
    TextFieldBehaviorProps,
    TextFieldContentProps,
    TextFieldElementIds,
    TextFieldPart,
    TextFieldRootOwnProps,
    TextFieldVariantProps,
} from "./components/text-field";
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
    themeAttributeOf,
    themeAttributes,
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
    ProviderTheme,
    ThemeHydration,
    ThemeName,
    ThemeOverrides,
} from "./provider";
export { selectionSignature, withDefaults } from "./selection";
export { trainVersionMismatch } from "./version";
export { warnOnce } from "./warn";

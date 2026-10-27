// Web machine assembly. Public behavior and selection contracts remain portable.
import type {
    AccordionBehaviorProps,
    AutocompleteBehaviorProps,
    AvatarRootOwnProps,
    ButtonGroupBehaviorProps,
    ButtonBehaviorProps,
    CarouselBehaviorProps,
    CheckboxBehaviorProps,
    ChipSetBehaviorProps,
    CodeFieldBehaviorProps,
    CopyButtonBehaviorProps,
    DatePickerBehaviorProps,
    DialogBehaviorProps,
    SelectionListBehaviorProps,
    MenuBehaviorProps,
    OverlayPlacement,
    FabBehaviorProps,
} from "@pureform/binding-core";
import {
    CODE_FIELD_LENGTH,
    COPIED_LABEL,
    COPY_LABEL,
    pickerLocale,
    localTimeZone,
    pickerWeekStart,
    selectionListDefaults,
    menuButtonPositioning,
} from "@pureform/binding-core";
import type {
    RippleBehaviorProps,
    SelectBehaviorProps,
    SheetBehaviorProps,
    SliderBehaviorProps,
    SliderVariantProps,
    SnackbarBehaviorProps,
    SplitterRootOwnProps,
    StepperBehaviorProps,
    StepperVariantProps,
    SwitchBehaviorProps,
    TableBehaviorProps,
    TabsBehaviorProps,
    TagsInputBehaviorProps,
    TextFieldBehaviorProps,
    TimeBehaviorProps,
    TreeBehaviorProps,
    FileUploadItem,
    FileUploadBehaviorProps,
    NumberFieldBehaviorProps,
    RatingBehaviorProps,
} from "@pureform/binding-core";
import {
    sheetModal,
    splitterOrientation,
    numberFieldLocale,
    NUMBER_FIELD_FORMAT,
} from "@pureform/binding-core";

import { menuMachineProps } from "./menu";

/** The ripple machine's props from Root's, besides `reducedMotion` (the binding's) and
 *  `rippleClass` (the `ripple` slot's classes). Its timing is the layer's transition, which the
 *  ripple's tokens set. */
export const rippleMachineProps = (props: RippleBehaviorProps) => ({
    disabled: props.disabled,
    variant: props.effect,
    centered: props.centered,
    allowPropagation: props.allowPropagation,
    ids: { layer: props.id },
});
const itemId = (
    id: ((value: string) => string) | undefined,
): ((value: string | number) => string) | undefined =>
    id === undefined ? undefined : (value) => id(String(value));
/** Zag's select props from Root's, besides `id`, `dir`, the collection, and the controllable
 *  `value` and `open`. `fieldsetDisabled` is the binding's `useFieldsetDisabled`. */
export const selectMachineProps = (
    props: SelectBehaviorProps,
    fieldsetDisabled: boolean,
) => ({
    disabled: props.disabled || fieldsetDisabled,
    invalid: props.invalid || !!props.error,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    autoComplete: props.autoComplete,
    positioning: {
        placement: "bottom-start" as const,
        sameWidth: true,
        fitViewport: true,
        ...props.positioning,
    },
    ids: {
        root: props.id ?? props.ids?.root,
        trigger: props.ids?.input,
        label: props.ids?.label,
        hiddenSelect: props.ids?.hiddenSelect,
        content: props.ids?.content,
        positioner: props.ids?.positioner,
        item: itemId(props.ids?.item),
    },
});
/** Zag's dialog props from a sheet Root's, besides `id`, `dir`, and the controllable `open`. A
 *  standard sheet isn't modal and a click outside doesn't close it. */
export const sheetMachineProps = (
    props: SheetBehaviorProps & { readonly modal?: boolean | undefined },
) => {
    const modal = sheetModal(props);
    // Never spread framework props: children can be getters.
    return {
        ...dialogMachineProps(props),
        modal,
        role: "dialog" as const,
        closeOnInteractOutside: props.closeOnInteractOutside ?? modal,
    };
};
/** The slider machine's props from Root's, besides `id` (the machine's, `machineId`), `dir`, and
 *  the controllable value. The root is also Zag's control, so both ids are the root's. */
export const sliderMachineProps = (
    props: SliderBehaviorProps & SliderVariantProps,
    machineId: string,
) => {
    const root = props.id ?? props.ids?.root ?? `slider:${machineId}`;
    return {
        min: props.min,
        max: props.max,
        step: props.step,
        largeStep: props.largeStep,
        minStepsBetweenThumbs: props.minStepsBetweenThumbs,
        origin: props.centered ? ("center" as const) : ("start" as const),
        orientation: (props.orientation === "vertical"
            ? "vertical"
            : "horizontal") as "vertical" | "horizontal",
        disabled: props.disabled,
        readOnly: props.readOnly,
        invalid: props.invalid,
        name: props.name,
        form: props.form,
        ids: {
            root,
            control: root,
            thumb: props.ids?.handle,
            hiddenInput: props.ids?.input,
        },
    };
};
/** The snackbar machine's props from Root's, besides `dir` and the controllable `open`. */
export const snackbarMachineProps = (props: SnackbarBehaviorProps) => ({
    duration: props.duration,
    onAction: props.onAction,
    ids: {
        root: props.id ?? props.ids?.root,
        supportingText: props.ids?.supportingText,
        action: props.ids?.action,
        close: props.ids?.close,
    },
});
/** The machine's props from Root's, besides the sizes (`splitterSizeProps`). */
export const splitterMachineProps = (
    props: Pick<
        SplitterRootOwnProps,
        "id" | "orientation" | "panels" | "keyboardResizeBy"
    >,
) => ({
    id: props.id,
    orientation: splitterOrientation(props),
    panels: props.panels.map((panel) => ({ ...panel })),
    keyboardResizeBy: props.keyboardResizeBy,
});
/** Zag's steps props from Root's, besides `id`, `dir` and the controllable `step`. Root's `id`
 *  becomes Zag's root id. */
export const stepperMachineProps = (
    props: StepperBehaviorProps & StepperVariantProps,
) => ({
    count: props.count,
    linear: props.linear,
    isStepValid: props.isStepValid,
    isStepSkippable: props.isStepSkippable,
    onStepInvalid: props.onStepInvalid,
    onStepComplete: props.onStepComplete,
    orientation:
        props.orientation === "vertical"
            ? ("vertical" as const)
            : ("horizontal" as const),
    ids: {
        root: props.id ?? props.ids?.root,
        list: props.ids?.list,
        triggerId: props.ids?.trigger,
        contentId: props.ids?.content,
    },
});
/** Zag's switch props from Root's, besides `id`, `dir`, and the controllable `checked` (the
 *  binding's `useControllable`). `fieldsetDisabled` is the binding's `useFieldsetDisabled`. */
export const switchMachineProps = (
    props: SwitchBehaviorProps,
    fieldsetDisabled: boolean,
) => ({
    disabled: props.disabled || fieldsetDisabled,
    invalid: props.invalid,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    value: props.value,
    ids: { root: props.id ?? props.ids?.root, hiddenInput: props.ids?.input },
});
/** The machine's props from the behavior props (less the controllable sort and selection, which
 *  the bindings map themselves). */
export const tableMachineProps = (props: TableBehaviorProps) => ({
    sortStart: props.sortStart,
    sortClearable: props.sortClearable,
    selectionMode: props.selectionMode,
    rows: props.rowValues ? [...props.rowValues] : undefined,
    translations: props.translations,
    ids: { root: props.id },
});
/** Zag's tabs props from Root's, besides `id`, `dir`, and the controllable `value`. Root's `id`
 *  becomes Zag's root id. */
export const tabsMachineProps = (props: TabsBehaviorProps) => ({
    activationMode: props.activationMode,
    loopFocus: props.loopFocus,
    ids: {
        root: props.id ?? props.ids?.root,
        list: props.ids?.list,
        trigger: props.ids?.trigger,
        content: props.ids?.content,
    },
});
/** The tags input machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). An error marks the field invalid. */
export const tagsInputMachineProps = (props: TagsInputBehaviorProps) => ({
    disabled: props.disabled,
    invalid: props.invalid || props.error !== undefined || undefined,
    required: props.required,
    readOnly: props.readOnly,
    placeholder: props.placeholder ?? " ",
    name: props.name,
    form: props.form,
    max: props.max,
    maxLength: props.maxLength,
    delimiter: props.delimiter,
    addOnPaste: props.addOnPaste,
    allowDuplicates: props.allowDuplicates,
    blurBehavior: props.blurBehavior,
    validate: props.validate,
    translations: props.removeLabel
        ? { deleteTagTriggerLabel: props.removeLabel }
        : undefined,
});
/** The text field machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). */
export const textFieldMachineProps = (
    props: TextFieldBehaviorProps & { readonly secure?: boolean | undefined },
) => ({
    disabled: props.disabled,
    invalid: props.invalid,
    error: props.error,
    validate: props.validate,
    required: props.required,
    readOnly: props.readOnly,
    placeholder: props.placeholder,
    name: props.name,
    form: props.form,
    counterMax: props.counterMax,
    secure: props.secure,
    revealLabel: props.revealLabel,
    ids: {
        root: props.id ?? props.ids?.root,
        input: props.ids?.input,
        label: props.ids?.label,
        supportingText: props.ids?.supportingText,
        counter: props.ids?.counter,
    },
});
/** The machine's props from the behavior props (less the controllable value, which the bindings
 *  map themselves). */
export const timeMachineProps = (props: TimeBehaviorProps) => ({
    hourCycle: props.hourCycle,
    locale: props.locale,
    translations: props.translations,
    disabled: props.disabled,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    ids: { root: props.id },
});
/** Zag's tree view props from Root's, besides `id`, `dir`, the collection and the controllable
 *  values. */
export const treeMachineProps = (props: TreeBehaviorProps) => ({
    selectionMode: props.selectionMode,
    expandOnClick: props.expandOnClick,
});
/** The file upload machine's props from Root's, besides `id`, `dir` and the files (see
 *  `fileUploadValueProps`). An error marks the drop zone invalid. */
export const fileUploadMachineProps = <F extends FileUploadItem>(
    props: FileUploadBehaviorProps<F>,
) => ({
    onFileAccept: props.onFileAccept,
    onFileReject: props.onFileReject,
    disabled: props.disabled,
    readOnly: props.readOnly,
    required: props.required,
    invalid: props.invalid || props.error !== undefined || undefined,
    accept: props.accept,
    maxFiles: props.maxFiles,
    maxFileSize: props.maxFileSize,
    minFileSize: props.minFileSize,
    allowDrop: props.allowDrop,
    directory: props.directory,
    capture: props.capture,
    validate: props.validate,
    name: props.name,
    translations: {
        deleteFile: props.removeLabel ?? ((file: F) => `Remove ${file.name}`),
    },
});
/** The number input machine's props from Root's, besides `id`, `dir`, and the controllable
 *  `value` (the binding's `useControllable`). An error marks the field invalid. */
export const numberFieldMachineProps = (props: NumberFieldBehaviorProps) => ({
    min: props.min,
    max: props.max,
    step: props.step,
    largeStep: props.largeStep,
    allowOverflow: props.allowOverflow,
    allowMouseWheel: props.allowMouseWheel,
    spinOnPress: props.spinOnPress,
    locale: numberFieldLocale(props),
    formatOptions: props.formatOptions ?? NUMBER_FIELD_FORMAT,
    disabled: props.disabled,
    invalid: props.error !== undefined ? true : props.invalid,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    translations: {
        ...(props.decrementLabel !== undefined
            ? { decrementLabel: props.decrementLabel }
            : {}),
        ...(props.incrementLabel !== undefined
            ? { incrementLabel: props.incrementLabel }
            : {}),
    },
});
/** The rating machine's props from Root's, besides `id`, `dir`, and the controllable `value`. */
export const ratingMachineProps = (props: RatingBehaviorProps) => ({
    count: props.count,
    allowHalf: props.allowHalf,
    readOnly: props.readOnly,
    disabled: props.disabled,
    required: props.required,
    name: props.name,
    form: props.form,
    translations: props.valueText
        ? { ratingValueText: props.valueText }
        : undefined,
});
import type {
    PopoverBehaviorProps,
    TooltipBehaviorProps,
    RadioGroupBehaviorProps,
    PaginatorBehaviorProps,
    NavigationModalProps,
    NavigationBehaviorProps,
    NavigationItemOwnProps,
    SearchViewBehaviorProps,
    SearchBarBehaviorProps,
} from "@pureform/binding-core";
import { isInteractiveTooltip, searchViewLabel } from "@pureform/binding-core";

/** Zag's popover props from Root's, besides `id`, `dir`, and the controllable `open`. It's
 *  rendered in place, so Zag isn't told it's portalled. */
export const popoverMachineProps = (props: PopoverBehaviorProps) => ({
    modal: props.modal,
    portalled: false,
    autoFocus: props.autoFocus,
    closeOnInteractOutside: props.closeOnInteractOutside,
    closeOnEscape: props.closeOnEscape,
    restoreFocus: props.restoreFocus,
    positioning: { placement: "bottom-start" as const, ...props.positioning },
    ids: {
        trigger: props.ids?.trigger,
        positioner: props.ids?.positioner,
        content: props.ids?.content,
        title: props.ids?.title,
        description: props.ids?.body,
        closeTrigger: props.ids?.closeTrigger,
        arrow: props.ids?.caret,
    },
});
/** Zag's tooltip props from Root's, besides `id`, `dir`, and the controllable `open`. */
export const tooltipMachineProps = (
    props: TooltipBehaviorProps,
    interactiveByDefault = false,
) => ({
    openDelay: props.openDelay,
    closeDelay: props.closeDelay,
    disabled: props.disabled,
    interactive: isInteractiveTooltip(props, interactiveByDefault),
    closeOnEscape: props.closeOnEscape,
    closeOnClick: props.closeOnClick,
    positioning: { placement: "bottom" as const, ...props.positioning },
    ids: {
        trigger: props.ids?.trigger,
        positioner: props.ids?.positioner,
        content: props.ids?.content,
    },
});
/** Zag's tooltip props from Root's, interactive unless told otherwise. */
export const richTooltipMachineProps = (props: TooltipBehaviorProps) =>
    tooltipMachineProps(props, true);
/** Zag's radio group props from Root's, besides `id`, `dir`, and the controllable `value` (the
 *  binding's `useControllable`). `fieldsetDisabled` is the binding's `useFieldsetDisabled`. */
export const radioGroupMachineProps = (
    props: RadioGroupBehaviorProps,
    fieldsetDisabled: boolean,
) => ({
    disabled: props.disabled || fieldsetDisabled,
    invalid: props.invalid,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    orientation: props.orientation,
    ids: {
        root: props.id ?? props.ids?.root,
        item: props.ids?.item,
        itemHiddenInput: props.ids?.itemHiddenInput,
    },
});
/** Zag's props from Root's, besides the controllable page and page size (the binding's
 *  `useControllable`) and `id`: the item count and the words the triggers carry. */
export const paginatorMachineProps = (props: PaginatorBehaviorProps) => ({
    count: props.count ?? 0,
    translations: {
        rootLabel: props.translations?.rootLabel,
        firstTriggerLabel: props.translations?.firstPage,
        prevTriggerLabel: props.translations?.previousPage,
        nextTriggerLabel: props.translations?.nextPage,
        lastTriggerLabel: props.translations?.lastPage,
    },
});
/** Zag's dialog props for a modal rail, from Root's, besides `id`, `dir`, and the controllable
 *  `open`. The rail's `aria-label` names the dialog too. */
export const navigationModalMachineProps = (
    props: NavigationModalProps & {
        readonly "aria-label"?: string | undefined;
    },
) => ({
    modal: true,
    closeOnEscape: props.closeOnEscape,
    closeOnInteractOutside: props.closeOnInteractOutside,
    "aria-label": props["aria-label"],
});
/** The navigation machine's props from Root's, besides `id`, `dir`, and the controllable `value`.
 *  Root's `id` becomes the machine's root id. */
export const navigationMachineProps = (props: NavigationBehaviorProps) => ({
    disabled: props.disabled,
    ids: { root: props.id ?? props.ids?.root, item: props.ids?.item },
});
/** The machine's item props for a destination: a link to a page says `aria-current="page"`, a
 *  button `"true"`. */
export const navigationItemMachineProps = (item: NavigationItemOwnProps) => ({
    value: item.value,
    disabled: item.disabled,
    current: item.href === undefined ? ("true" as const) : ("page" as const),
});
/** Zag's dialog props for the view, besides `id`, `dir` and the controllable `open`: modal, so
 *  focus stays in it and goes back to the search bar once it closes. The web adds the input that
 *  takes focus as it opens (`@pureform/binding-web`'s `searchViewDomDialogProps`). */
export const searchViewDialogProps = (props: SearchViewBehaviorProps) => ({
    modal: true,
    role: "dialog" as const,
    restoreFocus: true,
    "aria-label": searchViewLabel(props),
    ids: { content: props.ids?.surface },
});
/** Zag's combobox props for the query, besides `id`, `dir`, the collection and the controllable
 *  `inputValue`: always open while the view is, and leaving dismissal to the view's dialog. */
export const searchViewComboboxProps = (
    props: SearchViewBehaviorProps,
    open: boolean,
) => ({
    open,
    disableLayer: true,
    allowCustomValue: true,
    selectionBehavior: "replace" as const,
    placeholder: props.placeholder ?? "",
    disabled: props.disabled,
    ids: {
        root: props.id ?? props.ids?.root,
        input: props.ids?.input,
        content: props.ids?.content,
    },
});
/** The text field machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). The placeholder is the input's own: a search bar has no
 *  floating label. */
export const searchBarMachineProps = (props: SearchBarBehaviorProps) => ({
    disabled: props.disabled,
    required: props.required,
    readOnly: props.readOnly,
    placeholder: props.placeholder ?? "",
    name: props.name,
    form: props.form,
    ids: { root: props.id ?? props.ids?.root, input: props.ids?.input },
});

/** Zag's accordion props from Root's, besides `id`, `dir`, and the controllable `value`. Root's
 *  `id` becomes Zag's root id. An item collapses from its header by default, as Angular's
 *  expansion panels do. */
export const accordionMachineProps = (props: AccordionBehaviorProps) => ({
    multiple: props.multiple,
    collapsible: props.collapsible ?? true,
    disabled: props.disabled,
    ids: {
        root: props.id ?? props.ids?.root,
        item: props.ids?.item,
        itemContent: props.ids?.itemContent,
        itemTrigger: props.ids?.itemTrigger,
    },
});

/** Zag's combobox props from Root's, besides `id`, `dir`, the collection, and the controllable
 *  `value`, `inputValue` and `open`. `fieldsetDisabled` is the binding's `useFieldsetDisabled`. */
export const autocompleteMachineProps = (
    props: AutocompleteBehaviorProps,
    fieldsetDisabled: boolean,
) => ({
    disabled: props.disabled || fieldsetDisabled,
    invalid: props.invalid || !!props.error,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    allowCustomValue: props.allowCustomValue ?? true,
    // Controlled values rejected by the owner must not replace the query.
    selectionBehavior: "preserve" as const,
    openOnClick: props.openOnClick ?? false,
    placeholder: " ",
    positioning: {
        placement: "bottom-start" as const,
        sameWidth: true,
        fitViewport: true,
        ...props.positioning,
    },
    ids: {
        root: props.id ?? props.ids?.root,
        input: props.ids?.input,
        label: props.ids?.label,
        content: props.ids?.content,
        positioner: props.ids?.positioner,
        item: itemId(props.ids?.item),
    },
});
/** The machine's props from Root's. */
export const avatarMachineProps = (
    props: Pick<AvatarRootOwnProps, "id" | "onStatusChange">,
) => ({ id: props.id, onStatusChange: props.onStatusChange });
/** Zag's toggle group props from Root's, besides `id`, `dir`, and the controllable `value` (the
 *  binding's `useControllable`). */
export const buttonGroupMachineProps = (props: ButtonGroupBehaviorProps) => ({
    multiple: props.selectable === "multiple",
    deselectable: props.deselectable ?? true,
    disabled: props.disabled,
    orientation: "horizontal" as const,
});
/** The button machine's props from Root's, besides `id`, `dir`, and the controllable `selected`
 *  (the binding's `useControllable`). Root's `id` becomes the machine's root id. */
export const buttonMachineProps = (props: ButtonBehaviorProps) => ({
    disabled: props.disabled,
    type: props.type,
    name: props.name,
    value: props.value,
    form: props.form,
    toggle: props.toggle,
    ids: { root: props.id ?? props.ids?.root, label: props.ids?.label },
});
/** Zag's carousel props from Root's, besides `id`, `dir`, `slideCount` and the controllable
 *  `page`. Root's `id` becomes Zag's root id. */
export const carouselMachineProps = (props: CarouselBehaviorProps) => ({
    allowMouseDrag: props.allowMouseDrag,
    ids: props.id === undefined ? undefined : { root: props.id },
});
/** Zag's checkbox props from Root's, besides `id`, `dir`, and the controllable `checked` (the
 *  binding's `useControllable`). `fieldsetDisabled` is the binding's `useFieldsetDisabled`, which
 *  follows every fieldset around the input rather than only the closest. */
export const checkboxMachineProps = (
    props: CheckboxBehaviorProps,
    fieldsetDisabled: boolean,
) => ({
    disabled: props.disabled || fieldsetDisabled,
    invalid: props.invalid,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    value: props.value,
    ids: { root: props.id ?? props.ids?.root, hiddenInput: props.ids?.input },
});
/** Zag's toggle group props from Root's, besides `id`, `dir`, and the controllable `value`: the
 *  button group's, as both are selectable rows of toggles. */
export const chipSetMachineProps: (
    props: ChipSetBehaviorProps,
) => ReturnType<typeof buttonGroupMachineProps> = buttonGroupMachineProps;
/** The pin input machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). An error marks the cells invalid. */
export const codeFieldMachineProps = (props: CodeFieldBehaviorProps) => ({
    count: props.length ?? CODE_FIELD_LENGTH,
    type: props.type ?? "numeric",
    otp: props.otp,
    mask: props.mask,
    onValueComplete: props.onValueComplete,
    blurOnComplete: props.blurOnComplete,
    selectOnFocus: props.selectOnFocus,
    placeholder: props.placeholder ?? "",
    disabled: props.disabled,
    invalid: props.error !== undefined ? true : props.invalid,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    translations: props.cellLabel ? { inputLabel: props.cellLabel } : undefined,
});
/** The clipboard machine's props from the copy button's: the value, the timeout, the names,
 *  `onCopy` once copied and `onCopyError` when the write is denied. */
export const copyButtonMachineProps = (props: CopyButtonBehaviorProps) => ({
    value: props.value,
    timeout: props.timeout,
    translations: {
        triggerLabel: (copied: boolean) =>
            copied
                ? (props.copiedLabel ?? COPIED_LABEL)
                : (props.label ?? COPY_LABEL),
    },
    onStatusChange: ({ copied }: { copied: boolean }) => {
        if (copied) props.onCopy?.(props.value);
    },
    onCopyError: (details: { value: string; error: Error }) =>
        props.onCopyError?.(details),
});
export const dateMachineProps = <D>(
    props: DatePickerBehaviorProps,
    parse: (value: string) => D | undefined,
) => ({
    locale: pickerLocale(props),
    timeZone: localTimeZone(),
    startOfWeek: pickerWeekStart(props),
    selectionMode: props.selectionMode,
    min: props.min === undefined ? undefined : parse(props.min),
    max: props.max === undefined ? undefined : parse(props.max),
    isDateUnavailable: props.isDateUnavailable
        ? (date: { toString(): string }) =>
              props.isDateUnavailable!(date.toString().slice(0, 10))
        : undefined,
    disabled: props.disabled,
    readOnly: props.readOnly,
    required: props.required,
    invalid: props.invalid,
    name: props.name,
});
/** Zag's dialog props from Root's, besides `id`, `dir`, and the controllable `open`. */
export const dialogMachineProps = (props: DialogBehaviorProps) => ({
    modal: props.modal,
    role: props.role,
    closeOnInteractOutside: props.closeOnInteractOutside,
    closeOnEscape: props.closeOnEscape,
    restoreFocus: props.restoreFocus,
    "aria-label": props["aria-label"],
    ids: {
        trigger: props.ids?.trigger,
        backdrop: props.ids?.backdrop,
        positioner: props.ids?.positioner,
        content: props.ids?.content,
        title: props.ids?.headline,
        description: props.ids?.body,
        closeTrigger: props.ids?.closeTrigger,
    },
});
/** Zag's listbox props from Root's, besides `id`, `dir`, the collection, and the controllable
 *  `value`. */
export const selectionListMachineProps = (
    props: SelectionListBehaviorProps,
) => ({
    ...selectionListDefaults(props),
    loopFocus: props.loopFocus,
    disabled: props.disabled,
    orientation: "vertical" as const,
    typeahead: true,
});
/** The menu machine's props from a menu button's Root (the split button's, the FAB menu's): the
 *  menu's, opening at `placement` unless `positioning` says otherwise. */
export const menuButtonMachineProps = (
    props: MenuBehaviorProps,
    placement: OverlayPlacement,
) => ({
    ...menuMachineProps(props),
    positioning: menuButtonPositioning(props, placement),
});
/** The split button's menu opens under the trailing button, at its end. */
export const splitButtonMachineProps = (props: MenuBehaviorProps) =>
    menuButtonMachineProps(props, "bottom-end");
/** The FAB menu's items open above the FAB, at its end. */
export const fabMenuMachineProps = (props: MenuBehaviorProps) =>
    menuButtonMachineProps(props, "top-end");
/** The button machine's props from Root's, besides `id` and `dir`: never a toggle. */
export const fabMachineProps = (props: FabBehaviorProps) => ({
    disabled: props.disabled,
    type: props.type,
    name: props.name,
    value: props.value,
    form: props.form,
    toggle: false,
    ids: { root: props.id ?? props.ids?.root, label: props.ids?.label },
});

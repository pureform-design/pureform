import { withoutControls } from "@pureform/binding-core";
import { CAROUSEL_SIZES } from "@pureform/binding-core";
import type { CheckedState } from "@pureform/binding-core";

/** The sizes the items take before the row is measured (on the server, and the first paint): a
 *  large item each, or the row's width full screen. */
export const carouselInitialStyle = (
    layout: unknown,
    itemWidth: number = CAROUSEL_SIZES.itemWidth,
): string | undefined => (layout === "fullScreen" ? "100%" : `${itemWidth}px`);
/** The native input's default: what a form reset shows (`ControllableState.resetsTo`). The
 *  indeterminate state isn't native, so it resets unchecked. */
export const checkboxNativeDefault = (
    resetsTo: CheckedState | undefined,
): boolean => resetsTo === true;
/** The state a form reset sends the machine: the `defaultChecked` read at creation. */
export const checkboxResetState = (
    defaultChecked: CheckedState | undefined,
): CheckedState => defaultChecked ?? false;
/** The value a form reset sends the machine: the `defaultValue` read at creation. */
export const radioGroupResetValue = (
    defaultValue: string | null | undefined,
): string | null => defaultValue ?? null;
/** The native inputs' default: what a form reset shows (`ControllableState.resetsTo`), else
 *  `min`, the machine's default, one per thumb, joined by commas. */
export const sliderNativeDefault = (
    resetsTo: SliderValue | undefined,
    min: number | undefined,
): string => (sliderValues(resetsTo) ?? [min ?? 0]).join(",");
/** The native input's default: what a form reset shows (`ControllableState.resetsTo`). */
export const switchNativeDefault = (resetsTo: boolean | undefined): boolean =>
    resetsTo === true;
/** The native input's default: what a form reset shows (`ControllableState.resetsTo`). */
export const textFieldNativeDefault = (resetsTo: string | undefined): string =>
    resetsTo ?? "";
/** An item's own props (React's names), which make each item a stop of its own for Tab, as
 *  Compose's FAB menu items are: tabbable unless disabled, and highlighted while focused, so
 *  Enter and Space press the item that has focus. */
export const fabMenuItemFocusProps = (
    disabled: boolean | undefined,
    highlight: () => void,
) => ({ tabIndex: disabled ? -1 : 0, onFocus: highlight });
import {
    sliderValues,
    sliderValueShape,
    splitterInitialSizes,
} from "@pureform/binding-core";
import type {
    ChangeReason,
    ControllableMachineProps,
    FileUploadItem,
    FileUploadValueDetails,
    SliderValue,
    SplitterRootOwnProps,
    SplitterPanelData,
} from "@pureform/binding-core";

/** The files' controllable props (`useControllable`'s `value`, `defaultValue`, `onValueChange`)
 *  in Zag's names: `acceptedFiles`, `defaultAcceptedFiles`, `onFileChange`. */
export const fileUploadValueProps = <F extends FileUploadItem>(
    value: ControllableMachineProps<"value", F[], FileUploadValueDetails<F>>,
) => ({
    acceptedFiles: value.value,
    defaultAcceptedFiles: value.defaultValue,
    onFileChange: (details: {
        acceptedFiles: F[];
        rejectedFiles: { file: F; errors: string[] }[];
    }) =>
        value.onValueChange({
            value: details.acceptedFiles,
            rejectedFiles: details.rejectedFiles,
        }),
});
/** The controllable value's machine props (`useControllable`'s) as the machine takes them: lists,
 *  with the change reported in the shape the owner gave. */
export const sliderControllableProps = <
    D extends { readonly value: SliderValue; readonly reason?: ChangeReason },
>(props: {
    readonly value: SliderValue | undefined;
    readonly defaultValue: SliderValue | undefined;
    readonly onValueChange: (details: D) => void;
}) => {
    const given = props.value ?? props.defaultValue;
    return {
        value: sliderValues(props.value),
        defaultValue: sliderValues(props.defaultValue),
        onValueChange: ({ value }: { value: number[] }) =>
            props.onValueChange({ value: sliderValueShape(value, given) } as D),
    };
};
/** The machine's size props from the controllable ones (`size`, `defaultSize`, `onSizeChange`).
 *  Without either size, the panes share the room from the first render, so the server draws
 *  what the browser does. */
export const splitterSizeProps = (
    props: Pick<SplitterRootOwnProps, "size" | "defaultSize" | "onSizeChange">,
    panels: readonly SplitterPanelData[],
) => ({
    size: props.size === undefined ? undefined : [...props.size],
    defaultSize:
        props.defaultSize === undefined
            ? props.size === undefined
                ? splitterInitialSizes(panels, undefined, 0)
                : undefined
            : [...props.defaultSize],
    onResize:
        props.onSizeChange &&
        ((details: { size: number[] }) =>
            props.onSizeChange?.({ size: details.size })),
});
/** The divider's element props beside the machine's: named by `label`, marked pressed while
 *  dragged so the pill stays grown when the pointer leaves it. */
export const splitterTriggerProps = (options: {
    readonly label?: string | undefined;
    readonly dragging: boolean;
}) => ({
    "aria-label": options.label ?? "Resize panes",
    "data-pf-active": options.dragging ? "" : undefined,
});

/** Zag's trigger props for the `trailingIcon` part, a `<span>` the preset draws as the field's
 *  arrow: a button to assistive technology (Zag names it and marks it expanded). */
export const autocompleteTriggerProps = <P extends object>(
    props: P,
): P & { readonly role: "button" } => ({ ...props, role: "button" });
/** Zag's hidden-input props for the `input` part: without its visually hidden `style`, which the
 *  slot's own style replaces, and without `aria-labelledby`, which names a label part the preset
 *  doesn't have. `aria-readonly` marks a read-only checkbox. */
export const checkboxInputProps = <P extends object>(
    props: P,
    readOnly: boolean | undefined,
): Omit<P, "style" | "aria-labelledby"> & {
    readonly "aria-readonly": "true" | undefined;
} => {
    const {
        style: _style,
        "aria-labelledby": _labelledBy,
        ...rest
    } = props as P & { style?: unknown; "aria-labelledby"?: unknown };
    return { ...rest, "aria-readonly": readOnly ? "true" : undefined };
};
/** Zag's indicator props for the check and indeterminate marks: without `hidden`, since the CSS
 *  shows each mark in its state, with a transition. */
export const checkboxMarkProps = <P extends object>(
    props: P,
): Omit<P, "hidden"> => {
    const { hidden: _hidden, ...rest } = props as P & { hidden?: unknown };
    return rest;
};
/** Zag's hidden-input props for the `input` part: `role="switch"`, without Zag's visually hidden
 *  `style` (the slot's own replaces it) and without `aria-labelledby` (the preset has no label
 *  part). `aria-readonly` marks a read-only switch. */
export const switchInputProps = <P extends object>(
    props: P,
    readOnly: boolean | undefined,
): Omit<P, "style" | "aria-labelledby"> & {
    readonly role: "switch";
    readonly "aria-readonly": "true" | undefined;
} => ({ ...checkboxInputProps(props, readOnly), role: "switch" });
/** Zag's root props for the group element: without its inline `style`, an outline reset the
 *  preset doesn't need. */
export const buttonGroupRootProps = <P extends object>(
    props: P,
): Omit<P, "style"> => {
    const { style: _style, ...rest } = props as P & { style?: unknown };
    return rest;
};
/** Zag's item props for a button in a selectable group, without what the button sets itself:
 *  its `id` and `disabled` (the button's own props), and `type`. */
export const buttonGroupItemProps = <P extends object>(
    props: P,
): Omit<P, "id" | "disabled" | "type"> => {
    const {
        id: _id,
        disabled: _disabled,
        type: _type,
        ...rest
    } = props as P & { id?: unknown; disabled?: unknown; type?: unknown };
    return rest;
};
/** What an item of a selectable group (a grouped button, a set's chip) takes from Zag's toggle
 *  group: its item props (`buttonGroupItemProps`), its `id` and `disabled`, and `selected` as
 *  its pressed state, which the group changes, not the item. */
export const toggleGroupItemProps = <I extends object, P extends object>(
    api: {
        getItemProps(item: I): P;
        getItemState(item: I): {
            readonly id: string;
            readonly disabled: boolean;
            readonly pressed: boolean;
        };
    },
    item: I,
) => {
    const state = api.getItemState(item);
    return {
        ...buttonGroupItemProps(api.getItemProps(item)),
        id: state.id,
        disabled: state.disabled,
        selected: state.pressed,
        onSelectedChange: () => {},
    };
};
/** Root's element props: an `<hr>` is a separator already; any other element gets the role. */
export const separatorRootProps = (element: unknown) =>
    element === "hr" ? {} : { role: "separator" as const };
/** Zag's tab props for one tab: without `data-ssr`, which Zag drops once it starts, so the
 *  server's markup and the hydrated page would disagree; without `aria-controls` when the tab has
 *  no panel to name. `disabled` is the tab's own or the tabs'. */
export const tabsTriggerProps = <P extends object>(
    props: P,
    { controls }: { readonly controls: boolean },
): Omit<P, "data-ssr"> => {
    const { "data-ssr": _ssr, ...rest } = props as P & { "data-ssr"?: unknown };
    return withoutControls(rest, controls);
};

// The native select: Root, a wrapper span that holds the platform's own `<select>` (Select) and its
// chevron (Icon); Group (`<optgroup>`) and Option (`<option>`) inside it; and the ready-made
// NativeSelect over them, which takes its options as data. It has no machine: the browser's
// `<select>` takes the value, the form, the keyboard and the list. Root owns the value (controlled
// or not, one value or with `multiple` several), the form reset and the fieldset rule, the interaction
// source the state layer reads, and inside a Field, the field's id, states and descriptions.

import { nativeSelectAnatomy } from "@pureform/anatomy";
import {
    NATIVE_SELECT_ATTRIBUTE_PROPS,
    NATIVE_SELECT_CONTENT_PROPS,
    NATIVE_SELECT_ROOT_PROPS,
    joinIdRefs,
    nativeSelectGroups,
    nativeSelectProps,
    nativeSelectSelection,
    nativeSelectValue,
    sameNativeSelectValue,
} from "@pureform/binding-core";
import type {
    NativeSelectContentProps,
    NativeSelectItem,
    NativeSelectRootOwnProps,
    NativeSelectValue,
    NativeSelectValueKeys,
    NativeSelectValueProps,
} from "@pureform/binding-core";
import {
    type ChangeEvent,
    type ElementType,
    type ReactNode,
    type SelectHTMLAttributes,
    useId,
    useRef,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { useField } from "../field/context";
import { useFieldsetDisabled, useFormReset } from "../form";
import { DropDownArrow } from "../glyphs";
import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof nativeSelectAnatomy;

/** What Root shares with its parts. */
interface NativeSelectContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly setSelect: (select: HTMLSelectElement | null) => void;
    /** The `<select>`'s own props: its value, id, name, validity and the handlers that emit its
     *  interactions. */
    readonly selectProps: Readonly<Record<string, unknown>>;
}

const context = createPartContext<NativeSelectContextValue>("NativeSelect");

/** Root's props: the instance tokens, the value (`value`, `defaultValue`, `onValueChange`; an
 *  array with `multiple`), `disabled`, `invalid`, `required`, `name`, `form`, `id` (the select's;
 *  a Field around gives it, and the states and descriptions), `testId` and `unstyled`
 *  for every part, `as`, and the element's own props. */
export type NativeSelectRootProps = RootBaseProps & NativeSelectValueProps;

type RootBaseProps = Omit<PartProps, keyof NativeSelectRootOwnProps> &
    Omit<NativeSelectRootOwnProps, NativeSelectValueKeys> & {
        /** Another element or component to render instead of `<span>`. */
        readonly as?: ElementType | undefined;
    };

export type { NativeSelectValueProps };

/** A part's props: the element's own, and the part's `unstyled`. */
export interface NativeSelectPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The `<select>`'s props: its attributes (`aria-label`, `autoComplete`, …), and `unstyled`. */
export interface NativeSelectSelectProps extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "value" | "defaultValue" | "onChange" | "multiple" | "ref"
> {
    readonly ref?: PartProps["ref"];
    readonly unstyled?: boolean | undefined;
}

/** An `<optgroup>`'s props. */
export interface NativeSelectGroupProps extends NativeSelectPartProps {
    readonly label: string;
    readonly disabled?: boolean | undefined;
}

/** An `<option>`'s props. */
export interface NativeSelectOptionProps extends NativeSelectPartProps {
    readonly value?: string | undefined;
    readonly disabled?: boolean | undefined;
}

const firstValue = (select: HTMLSelectElement) =>
    select.options.length > 0 ? select.options[0]!.value : "";

/** The chosen options' values, in the options' order. */
const chosenValues = (select: HTMLSelectElement) =>
    [...select.selectedOptions].map((option) => option.value);

/** React's spelling of a value: a mutable array for a `<select multiple>`. */
const reactValue = (value: NativeSelectValue | undefined) =>
    typeof value === "string" || value === undefined ? value : [...value];

/** The select's root: a `<span>` around the `<select>` and the chevron. It draws the state layer. */
function Root(props: NativeSelectRootProps): ReactNode {
    const id = useId();
    const field = useField();
    const value = useControllable<"value", NativeSelectValue>(
        "NativeSelect",
        "value",
        props as NativeSelectRootOwnProps,
    );
    const [select, setSelect] = useState<HTMLSelectElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(select);
    const source = useOwnInteractionSource(props.interactionSource);
    const handlers = useInteractionHandlers(
        source,
        !!(props.disabled ?? field?.state.disabled) || fieldsetDisabled,
    );
    const shown = useRef(value.value ?? value.defaultValue);
    const report = (next: NativeSelectValue) => {
        shown.current = next;
        value.machineProps.onValueChange?.({ value: next });
    };
    useFormReset(select, {
        resetsTo: value.resetsTo,
        onBeforeReset: value.beforeReset,
        onReset: () => {
            if (!select) return;
            // The browser has put an uncontrolled select back; a controlled one keeps its value
            // until the owner takes the default we report.
            const next = value.controlled
                ? (value.defaultValue ??
                  (props.multiple ? [] : firstValue(select)))
                : nativeSelectValue(chosenValues(select), props.multiple);
            if (!sameNativeSelectValue(next, shown.current))
                value.reset(() => report(next));
        },
    });
    const scope = useComponent(nativeSelectAnatomy, {
        selection: nativeSelectSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
    });
    const { as, ...rest } = omitProps(props, NATIVE_SELECT_ROOT_PROPS);
    const selectProps = combinePartProps([
        nativeSelectProps(
            { ...props, id: props.id ?? (field ? undefined : id) },
            fieldsetDisabled,
            field?.state,
        ),
        value.controlled
            ? { value: reactValue(value.value) }
            : { defaultValue: reactValue(value.defaultValue) },
        {
            onChange: (event: ChangeEvent<HTMLSelectElement>) =>
                report(
                    nativeSelectValue(
                        chosenValues(event.currentTarget),
                        props.multiple,
                    ),
                ),
        },
        handlers,
    ]);
    return (
        <context.Provider value={{ scope, setSelect, selectProps }}>
            {scope.render("root", {
                element: "span",
                as,
                props: rest,
            })}
        </context.Provider>
    );
}

/** The native `<select>`, laid over the whole box: it takes every interaction, submits with the
 *  form, and is what assistive technology reads, so name it (`aria-label`, or a `<label for>`
 *  and Root's `id`). */
function Select({ unstyled, ...props }: NativeSelectSelectProps): ReactNode {
    const { scope, setSelect, selectProps } = context.use("Select");
    return scope.render("select", {
        element: "select",
        machine: selectProps,
        ref: setSelect as (element: HTMLElement | null) => void,
        unstyled,
        // Its own descriptions join the Field's rather than replacing them.
        props: {
            ...props,
            "aria-describedby": joinIdRefs(
                props["aria-describedby"],
                selectProps["aria-describedby"] as string | undefined,
            ),
        },
    });
}

/** The chevron, hidden from assistive technology: the platform's own arrow is turned off. */
function Icon({ unstyled, ...props }: NativeSelectPartProps): ReactNode {
    const { scope } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        unstyled,
        props,
    });
}

/** A group of options, an `<optgroup>` with its `label`. */
function Group({ unstyled, ...props }: NativeSelectGroupProps): ReactNode {
    const { scope } = context.use("Group");
    return scope.render("group", { element: "optgroup", unstyled, props });
}

/** An option: an `<option>` with its `value`. */
function Option({ unstyled, ...props }: NativeSelectOptionProps): ReactNode {
    const { scope } = context.use("Option");
    return scope.render("option", { element: "option", unstyled, props });
}

/** The attributes of the ready-made component that go on the `<select>`, in React's spelling. */
const REACT_SELECT_PROPS = ["autoComplete", "autoFocus", "size"] as const;

/** The ready-made native select's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by part, the options as `items`, a `placeholder` and the `icon`, and the select's attributes
 *  (`aria-label`, `autoComplete`, …), which go on it. Option elements as `children` come after the
 *  items. */
export type NativeSelectProps = Omit<
    RootBaseProps,
    keyof SlotKeyedProps<Anatomy>
> &
    SlotKeyedProps<Anatomy> &
    NativeSelectContentProps<ReactNode> &
    Pick<
        SelectHTMLAttributes<HTMLSelectElement>,
        | (typeof NATIVE_SELECT_ATTRIBUTE_PROPS)[number]
        | (typeof REACT_SELECT_PROPS)[number]
    > &
    NativeSelectValueProps;

const SELECT_PROPS = [...NATIVE_SELECT_ATTRIBUTE_PROPS, ...REACT_SELECT_PROPS];

const READY_MADE_PROPS = [
    "className",
    "style",
    "slotProps",
    "children",
    ...NATIVE_SELECT_CONTENT_PROPS,
    ...SELECT_PROPS,
] as const;

const options = (
    items: readonly NativeSelectItem[],
    slot: (part: "group" | "option") => object,
): ReactNode =>
    nativeSelectGroups(items).map((run, index) => {
        const entries = run.items.map((item) => (
            <Option
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                {...slot("option")}
            >
                {item.label}
            </Option>
        ));
        return run.group === undefined ? (
            entries
        ) : (
            <Group key={`group-${index}`} label={run.group} {...slot("group")}>
                {entries}
            </Group>
        );
    });

/** The ready-made native select: Root around the `<select>` with its options, and the chevron. */
function ReadyMade(props: NativeSelectProps): ReactNode {
    const slot = useSlotProps(props);
    const rootProps = omitProps(
        props as NativeSelectProps & Record<string, unknown>,
        READY_MADE_PROPS as never,
    ) as NativeSelectRootProps;
    const selectAttributes: Record<string, unknown> = {};
    for (const key of SELECT_PROPS)
        selectAttributes[key] = (props as Record<string, unknown>)[key];
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <Select {...selectAttributes} {...slot("select")}>
                {props.placeholder !== undefined ? (
                    <Option value="" {...slot("option")}>
                        {props.placeholder}
                    </Option>
                ) : null}
                {options(props.items ?? [], slot)}
                {props.children}
            </Select>
            <Icon {...slot("icon")}>{props.icon ?? <DropDownArrow />}</Icon>
        </Root>
    );
}

/** A styled native `<select>`: `<NativeSelect name="size" items={sizes} aria-label="Size" />`.
 *  Or compose `NativeSelect.Root` around `NativeSelect.Select` (with `NativeSelect.Group` and
 *  `NativeSelect.Option`) and `NativeSelect.Icon`. */
export const NativeSelect = Object.assign(ReadyMade, {
    Root,
    Select,
    Icon,
    Group,
    Option,
});

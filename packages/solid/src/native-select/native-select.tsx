// The native select: Root, a wrapper span that holds the platform's own `<select>` (Select) and its
// chevron (Icon); Group (`<optgroup>`) and Option (`<option>`) inside it; and the ready-made
// NativeSelect over them, which takes its options as data. It has no machine: the browser's
// `<select>` takes the value, the form, the keyboard and the list. Root owns the value (controlled
// or not), the form reset and the fieldset rule, and the interaction source the state layer reads.

import { nativeSelectAnatomy } from "@pureform/anatomy";
import {
    NATIVE_SELECT_ATTRIBUTE_PROPS,
    NATIVE_SELECT_CONTENT_PROPS,
    NATIVE_SELECT_ROOT_PROPS,
    nativeSelectGroups,
    nativeSelectProps,
    nativeSelectSelection,
    nativeSelectValue,
    nativeSelectValues,
    sameNativeSelectValue,
} from "@pureform/binding-core";
import type {
    NativeSelectContentProps,
    NativeSelectRootOwnProps,
    NativeSelectValue,
} from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createSignal,
    createUniqueId,
    flush,
    For,
    omit,
    Show,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { useField } from "../field/context";
import { useFieldsetDisabled, useFormReset } from "../form";
import { DropDownArrow } from "../glyphs";
import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof nativeSelectAnatomy;

/** What Root shares with its parts. */
interface NativeSelectContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly setSelect: (select: HTMLSelectElement) => void;
    /** The chosen value, if any: the options mark theirs `selected`, which the server renders. */
    readonly chosen: Accessor<NativeSelectValue | undefined>;
    /** The `<select>`'s own props: its id, name, validity and the handlers that emit its
     *  interactions. */
    readonly selectProps: Accessor<Readonly<Record<string, unknown>>>;
}

const context = createPartContext<NativeSelectContextValue>("NativeSelect");

/** The value props, typed by `multiple`: a string for one option, an array of strings for
 *  several. */
export type NativeSelectValueProps =
    | {
          readonly multiple?: false | undefined;
          readonly value?: string | undefined;
          readonly defaultValue?: string | undefined;
          readonly onValueChange?:
              | ((details: {
                    readonly value: string;
                    readonly reason?: "reset" | undefined;
                }) => void)
              | undefined;
      }
    | {
          readonly multiple: true;
          readonly value?: readonly string[] | undefined;
          readonly defaultValue?: readonly string[] | undefined;
          readonly onValueChange?:
              | ((details: {
                    readonly value: readonly string[];
                    readonly reason?: "reset" | undefined;
                }) => void)
              | undefined;
      };

type ValueKeys = "multiple" | "value" | "defaultValue" | "onValueChange";

/** Root's props: the instance tokens, the value (`value`, `defaultValue`, `onValueChange`; arrays
 *  with `multiple`), `disabled`, `invalid`, `required`, `name`, `form`, `id` (the select's),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. Inside a Field, the
 *  field's id, states and descriptions apply, its own props winning. */
export type NativeSelectRootProps = RootBaseProps & NativeSelectValueProps;

type RootBaseProps = Omit<PartProps, keyof NativeSelectRootOwnProps> &
    Omit<NativeSelectRootOwnProps, ValueKeys> & {
        /** Another element or component to render instead of `<span>`. */
        readonly as?: ValidComponent | undefined;
    };

/** A part's props: the element's own, and the part's `unstyled`. */
export interface NativeSelectPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The `<select>`'s props: its attributes (`aria-label`, `autocomplete`, …), and `unstyled`. */
export interface NativeSelectSelectProps extends Omit<
    JSX.SelectHTMLAttributes<HTMLSelectElement>,
    "value" | "multiple"
> {
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

/** The value the select shows: its chosen options', in their order. */
const readValue = (select: HTMLSelectElement, multiple: boolean) =>
    multiple
        ? nativeSelectValue(
              [...select.selectedOptions].map((option) => option.value),
              true,
          )
        : select.value;

/** Shows `value` on the select. */
const showValue = (select: HTMLSelectElement, value: NativeSelectValue) => {
    if (typeof value === "string") {
        if (select.value !== value) select.value = value;
        return;
    }
    for (const option of select.options)
        option.selected = value.includes(option.value);
};

/** The select's root: a `<span>` around the `<select>` and the chevron. It draws the state layer. */
function Root(props: NativeSelectRootProps): JSX.Element {
    const id = createUniqueId();
    const field = useField();
    const value = useControllable<"value", NativeSelectValue>(
        "NativeSelect",
        "value",
        props as NativeSelectRootOwnProps,
    );
    const multiple = () => !!props.multiple;
    const [select, setSelect] = createSignal<HTMLSelectElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const fieldsetDisabled = useFieldsetDisabled(select);
    const source = useOwnInteractionSource(() => props.interactionSource);
    const disabled = () => !!props.disabled || fieldsetDisabled();
    const handlers = useInteractionHandlers(source, disabled);
    const [own, setOwn] = createSignal(value.defaultValue, {
        ownedWrite: true,
    });
    const chosen = () => value.value() ?? own();
    let shown = untrack(chosen);
    const report = (next: NativeSelectValue) => {
        shown = next;
        setOwn(next);
        untrack(value.machineProps).onValueChange?.({ value: next });
    };
    useFormReset(select, {
        resetsTo: value.resetsTo,
        onBeforeReset: value.beforeReset,
        onReset: () => {
            const element = untrack(select);
            if (!element) return;
            // The browser has put an uncontrolled select back; a controlled one keeps its value
            // until the owner takes the default we report.
            const many = untrack(multiple);
            const next = untrack(value.controlled)
                ? (value.defaultValue ?? (many ? [] : firstValue(element)))
                : readValue(element, many);
            if (!sameNativeSelectValue(next, shown))
                value.reset(() => report(next));
        },
    });
    const scope = useComponent(nativeSelectAnatomy, {
        selection: () => nativeSelectSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
        interactionSource: source,
    });
    const selectProps = () =>
        combinePartProps([
            nativeSelectProps(
                {
                    id: props.id ?? (field ? undefined : id),
                    name: props.name,
                    form: props.form,
                    required: props.required,
                    disabled: props.disabled,
                    invalid: props.invalid,
                    multiple: props.multiple,
                },
                fieldsetDisabled(),
                field?.state(),
            ),
            {
                onChange: (event: Event) => {
                    const element = event.currentTarget as HTMLSelectElement;
                    report(readValue(element, untrack(multiple)));
                    // A controlled select the owner didn't move goes back to its value.
                    queueMicrotask(() => {
                        flush();
                        const controlled = untrack(value.value);
                        if (controlled !== undefined)
                            showValue(element, controlled);
                    });
                },
            },
            handlers(),
        ]);
    return (
        <context.Provider value={{ scope, setSelect, chosen, selectProps }}>
            {scope.render("root", {
                element: "span",
                as: () => props.as,
                props: omit(props, "as", ...NATIVE_SELECT_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The native `<select>`, laid over the whole box: it takes every interaction, submits with the
 *  form, and is what assistive technology reads, so name it (`aria-label`, or a `<label for>`
 *  and Root's `id`). */
function Select(props: NativeSelectSelectProps): JSX.Element {
    const { scope, setSelect, selectProps } = context.use("Select");
    return scope.render("select", {
        element: "select",
        machine: selectProps,
        ref: (element) => setSelect(element as HTMLSelectElement),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The chevron, hidden from assistive technology: the platform's own arrow is turned off. */
function Icon(props: NativeSelectPartProps): JSX.Element {
    const { scope } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A group of options, an `<optgroup>` with its `label`. */
function Group(props: NativeSelectGroupProps): JSX.Element {
    const { scope } = context.use("Group");
    return scope.render("group", {
        element: "optgroup",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An option: an `<option>` with its `value`. */
function Option(props: NativeSelectOptionProps): JSX.Element {
    const { scope, chosen } = context.use("Option");
    return scope.render("option", {
        element: "option",
        machine: () => {
            const current = chosen();
            return {
                selected:
                    props.value !== undefined &&
                    (typeof current === "string"
                        ? current === props.value
                        : nativeSelectValues(current).includes(props.value)),
            };
        },
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made native select's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part, the options as `items`, a `placeholder` and the `icon`, and the select's attributes
 *  (`aria-label`, `autocomplete`, …), which go on it. Option elements as `children` come after
 *  the items. */
export type NativeSelectProps = Omit<
    RootBaseProps,
    keyof SlotKeyedProps<Anatomy>
> &
    SlotKeyedProps<Anatomy> &
    NativeSelectContentProps<JSX.Element> &
    Pick<
        JSX.SelectHTMLAttributes<HTMLSelectElement>,
        | (typeof NATIVE_SELECT_ATTRIBUTE_PROPS)[number]
        | "autocomplete"
        | "autofocus"
        | "size"
    > &
    NativeSelectValueProps;

const SELECT_PROPS = [
    ...NATIVE_SELECT_ATTRIBUTE_PROPS,
    "autocomplete",
    "autofocus",
    "size",
] as const;

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "children",
    ...NATIVE_SELECT_CONTENT_PROPS,
    ...SELECT_PROPS,
] as const;

/** The ready-made native select: Root around the `<select>` with its options, and the chevron. */
function ReadyMade(props: NativeSelectProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as NativeSelectRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    const select = slots("select");
    // The select's attributes, read from the props as they change.
    const attributes: Record<string, unknown> = {};
    for (const key of SELECT_PROPS) {
        Object.defineProperty(attributes, key, {
            enumerable: true,
            get: () => props[key],
        });
    }
    const groups = () => nativeSelectGroups(props.items ?? []);
    const entries = (
        items: () => readonly {
            value: string;
            label: string;
            disabled?: boolean | undefined;
        }[],
    ) => (
        <For each={items()} keyed={(item) => item.value}>
            {(item) => (
                <Option
                    value={item().value}
                    disabled={item().disabled}
                    {...slots("option")}
                >
                    {item().label}
                </Option>
            )}
        </For>
    );
    return (
        <Root {...own} {...root}>
            <Select {...attributes} {...(select as object)}>
                <Show when={props.placeholder !== undefined}>
                    <Option value="" {...slots("option")}>
                        {props.placeholder}
                    </Option>
                </Show>
                <For each={groups()} keyed={false}>
                    {(run) => (
                        <Show
                            when={run().group}
                            fallback={entries(() => run().items)}
                        >
                            {(label) => (
                                <Group label={label()} {...slots("group")}>
                                    {entries(() => run().items)}
                                </Group>
                            )}
                        </Show>
                    )}
                </For>
                {props.children}
            </Select>
            <Icon {...slots("icon")}>{props.icon ?? <DropDownArrow />}</Icon>
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

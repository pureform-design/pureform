// The select: Root on Zag's select machine, the field's parts as the preset draws them (a
// read-only combobox `<input>` in the text field's container, the arrow as its trailing icon),
// the list of options drawn as a menu, a hidden native `<select>` that submits, and the
// ready-made Select over them. The binding owns the form reset and the fieldset rule rather than
// Zag.

import { selectAnatomy, selectMenuAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    isPresent,
    SELECT_COLLECTION,
    SELECT_CONTENT_PROPS,
    SELECT_INPUT_LABEL_PROPS,
    SELECT_ROOT_PROPS,
    selectHiddenSelectProps,
    selectInputProps,
    selectMachineProps,
    selectMenuSelection,
    selectPositionerProps,
    presentProps,
    selectSelection,
    selectSupportingTextId,
    selectValueProps,
    toZagValue,
} from "@pureform/binding-core";
import type {
    SelectContentProps,
    SelectItem,
    SelectRootOwnProps,
} from "@pureform/binding-core";
import * as select from "@pureform/machines/select";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
} from "solid-js";

import { useControllable } from "../controllable";
import { useFieldsetDisabled, useFormReset } from "../form";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof selectAnatomy;
type MenuAnatomy = typeof selectMenuAnatomy;

/** What Root shares with its parts. */
interface SelectContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly menu: ComponentScope<MenuAnatomy>;
    readonly api: Accessor<select.Api<PropTypes>>;
    readonly dir: Accessor<"ltr" | "rtl">;
    readonly items: Accessor<readonly SelectItem[]>;
    /** The supporting text's id, and the message it shows instead of its own. */
    readonly supportingTextId: Accessor<string>;
    readonly errorText: Accessor<string | undefined>;
    /** What a form reset shows, for the hidden select's options. */
    readonly resetsTo: Accessor<string | null>;
    readonly setHiddenSelect: (element: HTMLSelectElement) => void;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
}

/** What an option shares with its parts. */
interface ItemContextValue {
    readonly item: Accessor<SelectItem>;
}

const context = createPartContext<SelectContextValue>("Select");
const itemContext = createPartContext<ItemContextValue>("Select", "Item");

/** Root's props: the variants and tokens, the machine's props (`items`, `value`, `open`, `name`,
 *  …), `testId` and `unstyled` for the field's parts, `as`, and the element's own props. */
export interface SelectRootProps
    extends Omit<PartProps, keyof SelectRootOwnProps>, SelectRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SelectPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface SelectIconProps extends SelectPartProps {
    readonly mirror?: boolean | undefined;
}

/** An option's props: the option, as data, and a part's. */
export interface SelectItemProps extends SelectPartProps {
    readonly item: SelectItem;
}

/** The select's root, a `<div>` around the field, the supporting text, the hidden select, and
 *  the list. */
function Root(props: SelectRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string | null>(
        "Select",
        "value",
        props,
    );
    const open = useControllable<"open", boolean>("Select", "open", props);
    const [hidden, setHidden] = createSignal<HTMLSelectElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const fieldsetDisabled = useFieldsetDisabled(hidden);
    // Read once per change: items written in place are made again each time they're read.
    const items = createMemo(() => props.items ?? []);
    const collection = createMemo(() =>
        select.collection<SelectItem>({
            items: [...items()],
            ...SELECT_COLLECTION,
        }),
    );
    const sources = itemInteractionSources();
    const service = useMachine(select.machine, () => ({
        id,
        ...sources.machineProps,
        dir: dir(),
        collection: collection(),
        ...selectMachineProps(props, fieldsetDisabled()),
        ...selectValueProps(value.machineProps()),
        ...open.machineProps(),
    }));
    const api = createMemo(() => select.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    const resetsTo = () => value.resetsTo() ?? null;
    useFormReset(hidden, {
        resetsTo,
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                service.send({
                    type: "VALUE.SET",
                    value: toZagValue(value.defaultValue ?? null),
                }),
            ),
    });
    // An error blocks submitting, as the hidden select's custom validity.
    createEffect(
        () => [hidden(), props.error] as const,
        ([element, error]) => element?.setCustomValidity(error ?? ""),
    );
    const scope = useComponent(selectAnatomy, {
        selection: () => selectSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const menu = useComponent(selectMenuAnatomy, {
        selection: () => selectMenuSelection(props),
        testId: () =>
            typeof props.testId === "string" ? props.testId : undefined,
        indication: () => props.indication,
    });
    return (
        <context.Provider
            value={{
                scope,
                menu,
                api,
                dir,
                items,
                supportingTextId: () => selectSupportingTextId(props, id),
                errorText: () => props.error || undefined,
                resetsTo,
                setHiddenSelect: setHidden,
                sources,
                presence,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...SELECT_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icons, the input, and the label. */
function Container(props: SelectPartProps): JSX.Element {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The combobox: a read-only `<input>` showing the chosen option, which opens the list on a
 *  click, Enter, Space, or an arrow key, and changes the value with the arrow keys sideways. */
function Input(props: SelectPartProps): JSX.Element {
    const { scope, api, dir } = context.use("Input");
    // The field's own default is the text it shows, so a form reset doesn't clear it; the select's
    // value, reset or not, decides what it shows.
    const [element, setElement] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    createEffect(
        () => [element(), api().valueAsString] as const,
        ([input, text]) => {
            if (input && input.defaultValue !== text) input.defaultValue = text;
        },
    );
    return scope.render("input", {
        element: "input",
        machine: () =>
            selectInputProps(
                api().getTriggerProps(),
                api().valueAsString,
                dir(),
            ),
        ref: (input) => setElement(input as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The floating label. */
function Label(props: SelectPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
function LeadingIcon(props: SelectIconProps): JSX.Element {
    const { scope } = context.use("LeadingIcon");
    return scope.render("leadingIcon", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

const affix = (part: "prefixText" | "suffixText", name: string) =>
    function Affix(props: SelectPartProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

/** Text before the value, shown once the label floats. Turn on Root's `prefixText` with it. */
const PrefixText = affix("prefixText", "PrefixText");
/** Text after the value, shown once the label floats. Turn on Root's `suffixText` with it. */
const SuffixText = affix("suffixText", "SuffixText");

/** The arrow at the end, which turns over while the list is open. */
function TrailingIcon(props: SelectIconProps): JSX.Element {
    const { scope, api } = context.use("TrailingIcon");
    return scope.render("trailingIcon", {
        element: "span",
        machine: () => api().getIndicatorProps(),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** Helper text under the field. With an `error`, it shows the error instead. */
function SupportingText(props: SelectPartProps): JSX.Element {
    const { scope, supportingTextId, errorText } =
        context.use("SupportingText");
    const children = {
        get children() {
            return errorText() ?? props.children;
        },
    };
    return scope.render("supportingText", {
        element: "span",
        machine: () => ({ id: supportingTextId() }),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), children),
    });
}

/** The hidden native `<select>`, with an option per item: it submits the value, resets, validates
 *  `required`, and takes autofill. The registry doesn't style it. */
function HiddenSelect(props: SelectPartProps): JSX.Element {
    const { scope, api, items, resetsTo, setHiddenSelect } =
        context.use("HiddenSelect");
    return scope.render("hiddenSelect", {
        element: "select",
        machine: () => selectHiddenSelectProps(api().getHiddenSelectProps()),
        ref: (element) => setHiddenSelect(element as HTMLSelectElement),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return (
                    <For
                        each={items()}
                        keyed={(item: SelectItem) => item.value}
                    >
                        {(item) => (
                            <option
                                value={item().value}
                                disabled={item().disabled}
                                defaultSelected={item().value === resetsTo()}
                            >
                                {item().label}
                            </option>
                        )}
                    </For>
                );
            },
        }),
    });
}

/** Places the list under the field; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
function Positioner(props: SelectPartProps): JSX.Element {
    const { menu, api, presence } = context.use("Positioner");
    return menu.render("positioner", {
        element: "div",
        machine: () =>
            selectPositionerProps(
                api().getPositionerProps(),
                presence.present(),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The list of options, drawn as a menu. It stays while its exit animation runs. */
function Content(props: SelectPartProps): JSX.Element {
    const { menu, api, presence } = context.use("Content");
    return menu.render("root", {
        element: "div",
        ref: presence.ref,
        machine: () =>
            presentProps(api().getContentProps(), presence.present()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An option, drawn as a menu item; the highlighted one shows the hover state. */
function Item(props: SelectItemProps): JSX.Element {
    const { menu, api, sources } = context.use("Item");
    const item = () => props.item;
    const source = sources.item(
        () => props.item.value,
        () => props.item.interactionSource,
    );
    return (
        <itemContext.Provider value={{ item }}>
            {menu.render("item", {
                element: "div",
                interactionSource: source,
                machine: () => api().getItemProps({ item: item() }),
                states: () => ({
                    hover: api().getItemState({ item: item() }).highlighted,
                }),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", "item"),
            })}
        </itemContext.Provider>
    );
}

/** An option's label. */
function ItemLabel(props: SelectPartProps): JSX.Element {
    const { menu, api } = context.use("ItemLabel");
    const { item } = itemContext.use("ItemLabel");
    return menu.render("itemLabel", {
        element: "span",
        machine: () => api().getItemTextProps({ item: item() }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The arrow the ready-made select shows unless given another: Material's drop-down arrow. */
const DropDownArrow = (): JSX.Element => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M7 10l5 5 5-5z" />
    </svg>
);

/** The ready-made select's props: Root's, with `class`, `style`, and `slotProps` keyed by the
 *  field's parts, and the label, supporting text, and icons as content. `aria-label`,
 *  `aria-labelledby`, and `aria-describedby` go on the combobox. */
export interface SelectProps
    extends
        Omit<
            SelectRootProps,
            | keyof SlotKeyedProps<Anatomy>
            | "children"
            | "leadingIcon"
            | "prefixText"
            | "suffixText"
        >,
        SlotKeyedProps<Anatomy>,
        SelectContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...SELECT_INPUT_LABEL_PROPS,
    ...SELECT_CONTENT_PROPS,
] as const;

// Inside Root, so it can read whether an error shows and the options.
function ReadyMadeContent(props: {
    readonly own: SelectProps;
    readonly slots: (part: PartName<Anatomy>) => PartProps;
}): JSX.Element {
    const { items, supportingTextId, errorText } = context.use("Root");
    const own = props.own;
    const container = props.slots("container");
    const leadingIcon = props.slots("leadingIcon");
    const prefixText = props.slots("prefixText");
    const suffixText = props.slots("suffixText");
    const input = props.slots("input");
    const label = props.slots("label");
    const trailingIcon = props.slots("trailingIcon");
    const supportingText = props.slots("supportingText");
    const hiddenSelect = props.slots("hiddenSelect") as object;
    const showsSupporting = createMemo(
        () => isPresent(own.supportingText) || errorText() !== undefined,
    );
    return (
        <>
            <Container {...container}>
                <Show when={isPresent(own.leadingIcon)}>
                    <LeadingIcon {...leadingIcon}>
                        {own.leadingIcon}
                    </LeadingIcon>
                </Show>
                <Show when={isPresent(own.prefixText)}>
                    <PrefixText {...prefixText}>{own.prefixText}</PrefixText>
                </Show>
                <Input
                    aria-label={own["aria-label"]}
                    aria-labelledby={own["aria-labelledby"]}
                    aria-describedby={
                        own["aria-describedby"] ??
                        (showsSupporting() ? supportingTextId() : undefined)
                    }
                    {...input}
                />
                <Show when={isPresent(own.suffixText)}>
                    <SuffixText {...suffixText}>{own.suffixText}</SuffixText>
                </Show>
                <Label {...label}>{own.label}</Label>
                <TrailingIcon {...trailingIcon}>
                    {isPresent(own.trailingIcon) ? (
                        own.trailingIcon
                    ) : (
                        <DropDownArrow />
                    )}
                </TrailingIcon>
            </Container>
            <Show when={showsSupporting()}>
                <SupportingText {...supportingText}>
                    {own.supportingText}
                </SupportingText>
            </Show>
            <HiddenSelect {...hiddenSelect} />
            <Positioner>
                <Content>
                    <For
                        each={items()}
                        keyed={(item: SelectItem) => item.value}
                    >
                        {(item) => (
                            <Item item={item()}>
                                <ItemLabel>{item().label}</ItemLabel>
                            </Item>
                        )}
                    </For>
                </Content>
            </Positioner>
        </>
    );
}

/** The ready-made select: the field in the preset's structure (the leading icon and supporting
 *  text only when given, or while an error shows), the hidden select, and the list. */
function ReadyMade(props: SelectProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as SelectRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    return (
        <Root
            {...own}
            leadingIcon={isPresent(props.leadingIcon) || undefined}
            prefixText={isPresent(props.prefixText) || undefined}
            suffixText={isPresent(props.suffixText) || undefined}
            {...root}
        >
            <ReadyMadeContent own={props} slots={slots} />
        </Root>
    );
}

/** Material's select. Use it ready-made, `<Select label="Size" name="size" items={[{ value: "s",
 *  label: "Small" }, …]} />`, or compose its parts under `Select.Root`: `Container` holding
 *  `LeadingIcon`, `PrefixText`, `Input`, `SuffixText`, `Label`, and `TrailingIcon`, then `SupportingText`, `HiddenSelect`,
 *  and `Positioner` holding `Content`, with an `Item` (holding an `ItemLabel`) per option. */
export const Select = Object.assign(ReadyMade, {
    Root,
    Container,
    LeadingIcon,
    PrefixText,
    Input,
    SuffixText,
    Label,
    TrailingIcon,
    SupportingText,
    HiddenSelect,
    Positioner,
    Content,
    Item,
    ItemLabel,
});

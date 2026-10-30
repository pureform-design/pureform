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
    selectGroupedItems,
    selectItemGroups,
    selectMenuSelection,
    selectSummary,
    selectSelection,
    selectSupportingTextId,
} from "@pureform/binding-core";
import type {
    MenuScopeInstances,
    SelectContentProps,
    SelectItem,
    SelectRootOwnProps,
    SelectValue,
    SelectValueKeys,
    SelectValueProps,
    Unstyled,
} from "@pureform/binding-core";
import {
    selectHiddenSelectProps,
    selectInputProps,
    selectMachineProps,
    selectValueProps,
    toZagValue,
} from "@pureform/binding-web";
import type { NativeDefault } from "@pureform/machines/form";
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
import { DropDownArrow } from "../glyphs";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import type { PartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, MenuScopeProps, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { selectFieldParts } from "../select-field-parts";
import type { SelectFieldContext } from "../select-field-parts";

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
    readonly resetsTo: Accessor<NativeDefault>;
    /** The field's text for the chosen options. */
    readonly valueText: Accessor<string>;
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
export type SelectRootProps = RootBaseProps & SelectValueProps;

interface RootBaseProps
    extends
        Omit<PartProps, keyof SelectRootOwnProps>,
        Omit<SelectRootOwnProps, SelectValueKeys> {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
    /** The list's own props, drawn as a menu: `testId`, `unstyled`, and `tokens` (the ready-made
     *  also takes `class`, `style`, and `slotProps` keyed by the menu's parts, an option's also by
     *  option, `MenuScopeInstances`). */
    readonly menuProps?: SelectMenuProps | undefined;
}

export type { SelectValueProps };

/** The list's own props, keyed by the menu's parts (an option's also by option). */
type SelectMenuProps = MenuScopeProps<MenuAnatomy, SelectItem>;

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
    const value = useControllable<"value", SelectValue>(
        "Select",
        "value",
        props as SelectRootOwnProps,
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
            items: selectGroupedItems(items()),
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
        ...selectValueProps(value.machineProps(), props.multiple),
        ...open.machineProps(),
    }));
    const api = createMemo(() => select.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    const resetsTo = () =>
        value.resetsTo() ?? (props.multiple ? ([] as string[]) : null);
    useFormReset(hidden, {
        resetsTo,
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                service.send({
                    type: "VALUE.SET",
                    value: toZagValue(
                        value.defaultValue ?? (props.multiple ? [] : null),
                    ),
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
        selection: () => ({
            ...selectMenuSelection(props),
            tokens: props.menuProps?.tokens,
        }),
        testId: () =>
            props.menuProps?.testId ??
            (typeof props.testId === "string" ? props.testId : undefined),
        unstyled: () =>
            props.menuProps?.unstyled as Unstyled<PartName<MenuAnatomy>>,
        indication: () => props.indication,
    });
    const rest = omit(props, "as", "menuProps", ...SELECT_ROOT_PROPS);
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
                valueText: () =>
                    props.summary
                        ? selectSummary(api().selectedItems, props.summary)
                        : api().valueAsString,
                setHiddenSelect: setHidden,
                sources,
                presence,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icons, the input, and the label. */
function Container(props: SelectPartProps): JSX.Element {
    const { scope, api } = context.use("Container");
    const rest = omit(props, "unstyled");
    return scope.render("container", {
        element: "div",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The combobox: a read-only `<input>` showing the chosen option, which opens the list on a
 *  click, Enter, Space, or an arrow key, and changes the value with the arrow keys sideways. */
function Input(props: SelectPartProps): JSX.Element {
    const { scope, api, dir, valueText } = context.use("Input");
    // The field's own default is the text it shows, so a form reset doesn't clear it; the select's
    // value, reset or not, decides what it shows.
    const [element, setElement] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    createEffect(
        () => [element(), valueText()] as const,
        ([input, text]) => {
            if (input && input.defaultValue !== text) input.defaultValue = text;
        },
    );
    const rest = omit(props, "unstyled");
    return scope.render("input", {
        element: "input",
        machine: () =>
            selectInputProps(api().getTriggerProps(), valueText(), dir()),
        ref: (input) => setElement(input as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

const field = selectFieldParts(
    context as unknown as PartContext<SelectFieldContext>,
    itemContext,
);

/** The floating label. */
const Label: (props: SelectPartProps) => JSX.Element = field.Label;

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon: (props: SelectIconProps) => JSX.Element = field.LeadingIcon;

/** Text before the value, shown once the label floats. Turn on Root's `prefixText` with it. */
const PrefixText: (props: SelectPartProps) => JSX.Element = field.PrefixText;
/** Text after the value, shown once the label floats. Turn on Root's `suffixText` with it. */
const SuffixText: (props: SelectPartProps) => JSX.Element = field.SuffixText;

/** Helper text under the field. With an `error`, it shows the error instead. */
const SupportingText: (props: SelectPartProps) => JSX.Element =
    field.SupportingText;

/** Places the list under the field; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
const Positioner: (props: SelectPartProps) => JSX.Element = field.Positioner;

/** The list of options, drawn as a menu. It stays while its exit animation runs. */
const Content: (props: SelectPartProps) => JSX.Element = field.Content;

/** The arrow at the end, which turns over while the list is open. */
function TrailingIcon(props: SelectIconProps): JSX.Element {
    const { scope, api } = context.use("TrailingIcon");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("trailingIcon", {
        element: "span",
        machine: () => api().getIndicatorProps(),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The hidden native `<select>`, with an option per item: it submits the value, resets, validates
 *  `required`, and takes autofill. The registry doesn't style it. */
function HiddenSelect(props: SelectPartProps): JSX.Element {
    const { scope, api, items, resetsTo, setHiddenSelect } =
        context.use("HiddenSelect");
    const merged = merge(omit(props, "unstyled"), {
        get children() {
            return (
                <For each={items()} keyed={(item: SelectItem) => item.value}>
                    {(item) => (
                        <option
                            value={item().value}
                            disabled={item().disabled}
                            defaultSelected={defaultChosen(
                                resetsTo(),
                                item().value,
                            )}
                        >
                            {item().label}
                        </option>
                    )}
                </For>
            );
        },
    });
    return scope.render("hiddenSelect", {
        element: "select",
        machine: () => selectHiddenSelectProps(api().getHiddenSelectProps()),
        ref: (element) => setHiddenSelect(element as HTMLSelectElement),
        unstyled: () => props.unstyled,
        props: merged,
    });
}

/** A group's props: its `id`, and a part's. */
export interface SelectItemGroupProps extends SelectPartProps {
    readonly id: string;
}

/** A group label's props: the `id` of the group it names, and a part's. */
export interface SelectItemGroupLabelProps extends SelectPartProps {
    readonly htmlFor: string;
}

/** A group of options, named by the ItemGroupLabel whose `htmlFor` is its `id`. */
const ItemGroup: (props: SelectItemGroupProps) => JSX.Element = field.ItemGroup;

/** A group's label. */
const ItemGroupLabel: (props: SelectItemGroupLabelProps) => JSX.Element =
    field.ItemGroupLabel;

/** An option, drawn as a menu item; the highlighted one shows the hover state. */
const Item: (props: SelectItemProps) => JSX.Element = field.Item;

/** An option's label. */
const ItemLabel: (props: SelectPartProps) => JSX.Element = field.ItemLabel;

/** The ready-made select's props: Root's, with `class`, `style`, and `slotProps` keyed by the
 *  field's parts, and the label, supporting text, and icons as content. `aria-label`,
 *  `aria-labelledby`, and `aria-describedby` go on the combobox. */
export type SelectProps = Omit<
    RootBaseProps,
    | keyof SlotKeyedProps<Anatomy>
    | "children"
    | "leadingIcon"
    | "prefixText"
    | "suffixText"
> &
    SlotKeyedProps<Anatomy> &
    SelectContentProps<JSX.Element> &
    SelectValueProps;

/** Whether an option is among what a reset shows. */
const defaultChosen = (resetsTo: NativeDefault, value: string): boolean =>
    Array.isArray(resetsTo) ? resetsTo.includes(value) : resetsTo === value;

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
    // oxlint-disable-next-line solid/reactivity -- the parent's own props, passed once and never replaced
    const own = props.own;
    // oxlint-disable-next-line solid/reactivity -- the parent's slot props function, passed once and never replaced
    const slots = props.slots;
    const container = slots("container");
    const leadingIcon = slots("leadingIcon");
    const prefixText = slots("prefixText");
    const suffixText = slots("suffixText");
    const input = slots("input");
    const label = slots("label");
    const trailingIcon = slots("trailingIcon");
    const supportingText = slots("supportingText");
    const hiddenSelect = slots("hiddenSelect") as object;
    const groups = createMemo(() => selectItemGroups(items()));
    const menuSlots = createSlotProps<
        MenuAnatomy,
        never,
        MenuScopeInstances<SelectItem>
    >({
        get class() {
            return own.menuProps?.class;
        },
        get style() {
            return own.menuProps?.style;
        },
        get slotProps() {
            return own.menuProps?.slotProps;
        },
        get unstyled() {
            return own.menuProps?.unstyled;
        },
    } as SlotKeyedProps<MenuAnatomy, never, MenuScopeInstances<SelectItem>>);
    const menuItemGroup = menuSlots("itemGroup");
    const menuItemGroupLabel = menuSlots("itemGroupLabel");
    const groupId = createUniqueId();
    // Each option's index in the order drawn, for a function of the copy.
    const order = createMemo(
        () =>
            new Map(
                groups()
                    .flatMap((group) => group.items)
                    .map((item, index) => [item, index]),
            ),
    );
    const renderItems = (list: () => readonly SelectItem[]) => (
        <For each={list()} keyed={(item: SelectItem) => item.value}>
            {(item) => {
                const copy = () => ({
                    index: order().get(item()) ?? 0,
                    item: item(),
                });
                return (
                    <Item item={item()} {...menuSlots("item", copy)}>
                        <ItemLabel {...menuSlots("itemLabel", copy)}>
                            {item().label}
                        </ItemLabel>
                    </Item>
                );
            }}
        </For>
    );
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
            <Positioner {...menuSlots("positioner")}>
                <Content {...menuSlots("root")}>
                    <For each={groups()} keyed={false}>
                        {(group, index) => (
                            <Show
                                when={group().group}
                                fallback={renderItems(() => group().items)}
                            >
                                {(name) => (
                                    <ItemGroup
                                        {...menuItemGroup}
                                        id={`${groupId}-${index}`}
                                    >
                                        <ItemGroupLabel
                                            // oxlint-disable-next-line solid/no-react-specific-props -- a component prop for Zag's getItemGroupLabelProps({ htmlFor }), not the DOM attribute
                                            htmlFor={`${groupId}-${index}`}
                                            {...menuItemGroupLabel}
                                        >
                                            {name()}
                                        </ItemGroupLabel>
                                        {renderItems(() => group().items)}
                                    </ItemGroup>
                                )}
                            </Show>
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
 *  `LeadingIcon`, `PrefixText`, `Input`, `SuffixText`, `Label`, and `TrailingIcon`, then
 *  `SupportingText`, `HiddenSelect`, and `Positioner` holding `Content`, with an `Item` (holding an
 *  `ItemLabel`) per option. Options can sit in an `ItemGroup`, named by an `ItemGroupLabel`; list
 *  them in `selectGroupedItems`' order. */
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
    ItemGroup,
    ItemGroupLabel,
    Item,
    ItemLabel,
});

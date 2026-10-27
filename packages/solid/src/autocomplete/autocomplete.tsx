// The autocomplete: Root on Zag's combobox machine, the field's parts as the preset draws them (an
// editable combobox `<input>` in the text field's container, the arrow as its trailing icon), the
// suggestions the typed text keeps, drawn as a menu, and the ready-made Autocomplete over them.
// The input submits its text. The binding owns the form reset and the fieldset rule.

import {
    autocompleteAnatomy,
    autocompleteMenuAnatomy,
} from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    AUTOCOMPLETE_ROOT_PROPS,
    autocompleteFilterText,
    autocompleteInitialText,
    autocompleteMatches,
    autocompleteMenuSelection,
    autocompleteSelection,
    autocompleteSupportingTextId,
    isPresent,
    SELECT_COLLECTION,
    SELECT_CONTENT_PROPS,
    SELECT_INPUT_LABEL_PROPS,
    selectGroupedItems,
    selectItemGroups,
} from "@pureform/binding-core";
import type {
    AutocompleteItem,
    AutocompleteRootOwnProps,
    InnerProps,
    MenuScopeInstances,
    SelectContentProps,
    Unstyled,
} from "@pureform/binding-core";
import {
    autocompleteMachineProps,
    autocompleteTriggerProps,
    selectValueProps,
    toZagValue,
} from "@pureform/binding-web";
import * as combobox from "@pureform/machines/combobox";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    omit,
    Show,
    untrack,
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
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { selectFieldParts } from "../select-field-parts";
import type { SelectFieldContext } from "../select-field-parts";

type Anatomy = typeof autocompleteAnatomy;
type MenuAnatomy = typeof autocompleteMenuAnatomy;

/** What Root shares with its parts. */
interface AutocompleteContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly menu: ComponentScope<MenuAnatomy>;
    readonly api: Accessor<combobox.Api<PropTypes>>;
    /** The suggestions the typed text keeps, in the list's order. */
    readonly matches: Accessor<readonly AutocompleteItem[]>;
    readonly supportingTextId: Accessor<string>;
    readonly errorText: Accessor<string | undefined>;
    readonly setInput: (element: HTMLInputElement) => void;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
}

interface ItemContextValue {
    readonly item: Accessor<AutocompleteItem>;
}

const context = createPartContext<AutocompleteContextValue>("Autocomplete");
const itemContext = createPartContext<ItemContextValue>("Autocomplete", "Item");

/** Root's props: the variants and tokens, the machine's props (`items`, `value`, `inputValue`,
 *  `open`, `name`, …), `testId` and `unstyled` for the field's parts, `as`, and the element's
 *  own props. */
export interface AutocompleteRootProps
    extends
        Omit<PartProps, keyof AutocompleteRootOwnProps>,
        AutocompleteRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
    /** The list's own props, drawn as a menu: `testId`, `unstyled`, and `tokens` (the ready-made
     *  also takes `class`, `style`, and `slotProps` keyed by the menu's parts, an option's also by
     *  option, `MenuScopeInstances`). */
    readonly menuProps?: MenuScopeProps | undefined;
}

/** The list's own props, keyed by the menu's parts (an option's also by option). */
type MenuScopeProps = Omit<
    InnerPropsOf<MenuAnatomy>,
    keyof SlotKeyedProps<MenuAnatomy>
> &
    InnerProps<
        SlotKeyedProps<MenuAnatomy, never, MenuScopeInstances<AutocompleteItem>>
    >;

/** A part's props: the element's own, and the part's `unstyled`. */
export interface AutocompletePartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface AutocompleteIconProps extends AutocompletePartProps {
    readonly mirror?: boolean | undefined;
}

/** A suggestion's props: the suggestion, as data, and a part's. */
export interface AutocompleteItemProps extends AutocompletePartProps {
    readonly item: AutocompleteItem;
}

/** The autocomplete's root, a `<div>` around the field, the supporting text, and the list. */
function Root(props: AutocompleteRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string | null>(
        "Autocomplete",
        "value",
        props,
    );
    const inputValue = useControllable<"inputValue", string>(
        "Autocomplete",
        "inputValue",
        props,
    );
    const open = useControllable<"open", boolean>(
        "Autocomplete",
        "open",
        props,
    );
    const [input, setInput] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const fieldsetDisabled = useFieldsetDisabled(input);
    // What the user typed, which the list filters by; every suggestion until then.
    const [typed, setTyped] = createSignal("");
    const initialText = untrack(() => autocompleteInitialText(props));
    // A reset's text: the default's, or the label of the value the reset leaves (a controlled
    // value stays until its owner takes the change).
    const defaultText = () =>
        autocompleteInitialText({
            items: props.items,
            defaultInputValue: inputValue.defaultValue,
            value: value.controlled() ? value.value() : undefined,
            defaultValue: value.defaultValue,
        });
    const matches = createMemo(() =>
        selectGroupedItems(
            autocompleteMatches(props.items ?? [], typed(), props.filter),
        ),
    );
    const collection = createMemo(() =>
        combobox.collection<AutocompleteItem>({
            items: matches(),
            ...SELECT_COLLECTION,
        }),
    );
    const sources = itemInteractionSources();
    const service = useMachine(combobox.machine, () => {
        const text = inputValue.machineProps();
        return {
            id,
            ...sources.machineProps,
            dir: dir(),
            collection: collection(),
            ...autocompleteMachineProps(props, fieldsetDisabled()),
            ...selectValueProps(value.machineProps()),
            ...text,
            defaultInputValue: initialText,
            onInputValueChange: (details: {
                inputValue: string;
                reason?: string | undefined;
            }) => {
                setTyped(autocompleteFilterText(details));
                text.onInputValueChange({ inputValue: details.inputValue });
            },
            ...open.machineProps(),
        };
    });
    const api = createMemo(() => combobox.connect(service, normalizeProps));
    const presence = usePresence(() => api().open);
    useFormReset(input, {
        resetsTo: () => inputValue.resetsTo() ?? defaultText() ?? "",
        onBeforeReset: () => {
            value.beforeReset();
            inputValue.beforeReset();
        },
        onReset: () => {
            value.reset(() =>
                service.send({
                    type: "VALUE.SET",
                    value: toZagValue(value.defaultValue ?? null),
                }),
            );
            inputValue.reset(() =>
                api().setInputValue(untrack(defaultText) ?? "", "script"),
            );
        },
    });
    // An error blocks submitting, as the input's custom validity.
    createEffect(
        () => [input(), props.error] as const,
        ([element, error]) => element?.setCustomValidity(error ?? ""),
    );
    const scope = useComponent(autocompleteAnatomy, {
        selection: () => autocompleteSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const menu = useComponent(autocompleteMenuAnatomy, {
        selection: () => ({
            ...autocompleteMenuSelection(props),
            tokens: props.menuProps?.tokens,
        }),
        testId: () =>
            props.menuProps?.testId ??
            (typeof props.testId === "string" ? props.testId : undefined),
        unstyled: () =>
            props.menuProps?.unstyled as Unstyled<PartName<MenuAnatomy>>,
        indication: () => props.indication,
    });
    const rest = omit(props, "as", "menuProps", ...AUTOCOMPLETE_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                menu,
                api,
                matches,
                supportingTextId: () => autocompleteSupportingTextId(props, id),
                errorText: () => props.error || undefined,
                setInput,
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
function Container(props: AutocompletePartProps): JSX.Element {
    const { scope, api } = context.use("Container");
    const rest = omit(props, "unstyled");
    return scope.render("container", {
        element: "div",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The combobox: an `<input>` whose text filters the suggestions. The arrow keys move through
 *  them, Enter chooses one, and Escape closes the list. */
function Input(props: AutocompletePartProps): JSX.Element {
    const { scope, api, setInput } = context.use("Input");
    const rest = omit(props, "unstyled");
    return scope.render("input", {
        element: "input",
        machine: () => api().getInputProps(),
        ref: (element) => setInput(element as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

const field = selectFieldParts(
    context as unknown as PartContext<SelectFieldContext>,
    itemContext,
);

/** The floating label. */
const Label: (props: AutocompletePartProps) => JSX.Element = field.Label;

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon: (props: AutocompleteIconProps) => JSX.Element =
    field.LeadingIcon;

/** Text before the input's, shown once the label floats. Turn on Root's `prefixText` with it. */
const PrefixText: (props: AutocompletePartProps) => JSX.Element =
    field.PrefixText;
/** Text after the input's, shown once the label floats. Turn on Root's `suffixText` with it. */
const SuffixText: (props: AutocompletePartProps) => JSX.Element =
    field.SuffixText;

/** Helper text under the field. With an `error`, it shows the error instead. */
const SupportingText: (props: AutocompletePartProps) => JSX.Element =
    field.SupportingText;

/** Places the list under the field; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
const Positioner: (props: AutocompletePartProps) => JSX.Element =
    field.Positioner;

/** The list of suggestions, drawn as a menu. It stays while its exit animation runs. */
const Content: (props: AutocompletePartProps) => JSX.Element = field.Content;

/** The arrow at the end, which opens or closes the list and turns over while it's open. It
 *  isn't in the tab order: the input has the keys. */
function TrailingIcon(props: AutocompleteIconProps): JSX.Element {
    const { scope, api } = context.use("TrailingIcon");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("trailingIcon", {
        element: "span",
        machine: () => autocompleteTriggerProps(api().getTriggerProps()),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** A group's props: its `id`, and a part's. */
export interface AutocompleteItemGroupProps extends AutocompletePartProps {
    readonly id: string;
}

/** A group label's props: the `id` of the group it names, and a part's. */
export interface AutocompleteItemGroupLabelProps extends AutocompletePartProps {
    readonly htmlFor: string;
}

/** A group of suggestions, named by the ItemGroupLabel whose `htmlFor` is its `id`. */
const ItemGroup: (props: AutocompleteItemGroupProps) => JSX.Element =
    field.ItemGroup;

/** A group's label. */
const ItemGroupLabel: (props: AutocompleteItemGroupLabelProps) => JSX.Element =
    field.ItemGroupLabel;

/** A suggestion, drawn as a menu item; the highlighted one shows the hover state. */
const Item: (props: AutocompleteItemProps) => JSX.Element = field.Item;

/** A suggestion's label. */
const ItemLabel: (props: AutocompletePartProps) => JSX.Element =
    field.ItemLabel;

/** The ready-made autocomplete's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  the field's parts, and the label, supporting text, and icons as content. `aria-label`,
 *  `aria-labelledby`, and `aria-describedby` go on the combobox. */
export interface AutocompleteProps
    extends
        Omit<
            AutocompleteRootProps,
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

// Inside Root, so it can read whether an error shows and the suggestions.
function ReadyMadeContent(props: {
    readonly own: AutocompleteProps;
    readonly slots: (part: PartName<Anatomy>) => PartProps;
}): JSX.Element {
    const { matches, supportingTextId, errorText } = context.use("Root");
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
    const groups = createMemo(() => selectItemGroups(matches()));
    const menuSlots = createSlotProps<
        MenuAnatomy,
        never,
        MenuScopeInstances<AutocompleteItem>
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
    } as SlotKeyedProps<
        MenuAnatomy,
        never,
        MenuScopeInstances<AutocompleteItem>
    >);
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
    const renderItems = (list: () => readonly AutocompleteItem[]) => (
        <For each={list()} keyed={(item: AutocompleteItem) => item.value}>
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

/** The ready-made autocomplete: the field in the preset's structure (the leading icon and
 *  supporting text only when given, or while an error shows) and the list of suggestions. */
function ReadyMade(props: AutocompleteProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as AutocompleteRootProps;
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

/** Material's autocomplete (an editable exposed dropdown menu). Use it ready-made,
 *  `<Autocomplete label="City" name="city" items={[{ value: "paris", label: "Paris" }, …]} />`,
 *  or compose its parts under `Autocomplete.Root`: `Container` holding `LeadingIcon`,
 *  `PrefixText`, `Input`, `SuffixText`, `Label`, and `TrailingIcon`, then `SupportingText` and
 *  `Positioner` holding `Content`, with an `Item` (holding an `ItemLabel`) per suggestion, in
 *  `ItemGroup`s named by `ItemGroupLabel`s if grouped. */
export const Autocomplete = Object.assign(ReadyMade, {
    Root,
    Container,
    LeadingIcon,
    PrefixText,
    Input,
    SuffixText,
    Label,
    TrailingIcon,
    SupportingText,
    Positioner,
    Content,
    ItemGroup,
    ItemGroupLabel,
    Item,
    ItemLabel,
});

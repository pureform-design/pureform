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
    autocompleteMachineProps,
    autocompleteMatches,
    autocompleteMenuSelection,
    autocompleteSelection,
    autocompleteSupportingTextId,
    autocompleteTriggerProps,
    isPresent,
    presentProps,
    SELECT_COLLECTION,
    SELECT_CONTENT_PROPS,
    SELECT_INPUT_LABEL_PROPS,
    selectGroupedItems,
    selectItemGroups,
    selectPositionerProps,
    selectValueProps,
    toZagValue,
} from "@pureform/binding-core";
import type {
    AutocompleteItem,
    AutocompleteRootOwnProps,
    SelectContentProps,
} from "@pureform/binding-core";
import * as combobox from "@pureform/machines/combobox";
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
    untrack,
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
}

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
        selection: () => autocompleteMenuSelection(props),
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
                props: omit(props, "as", ...AUTOCOMPLETE_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icons, the input, and the label. */
function Container(props: AutocompletePartProps): JSX.Element {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The combobox: an `<input>` whose text filters the suggestions. The arrow keys move through
 *  them, Enter chooses one, and Escape closes the list. */
function Input(props: AutocompletePartProps): JSX.Element {
    const { scope, api, setInput } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: () => api().getInputProps(),
        ref: (element) => setInput(element as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The floating label. */
function Label(props: AutocompletePartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
function LeadingIcon(props: AutocompleteIconProps): JSX.Element {
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
    function Affix(props: AutocompletePartProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

/** Text before the input's, shown once the label floats. Turn on Root's `prefixText` with it. */
const PrefixText = affix("prefixText", "PrefixText");
/** Text after the input's, shown once the label floats. Turn on Root's `suffixText` with it. */
const SuffixText = affix("suffixText", "SuffixText");

/** The arrow at the end, which opens or closes the list and turns over while it's open. It
 *  isn't in the tab order: the input has the keys. */
function TrailingIcon(props: AutocompleteIconProps): JSX.Element {
    const { scope, api } = context.use("TrailingIcon");
    return scope.render("trailingIcon", {
        element: "span",
        machine: () => autocompleteTriggerProps(api().getTriggerProps()),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** Helper text under the field. With an `error`, it shows the error instead. */
function SupportingText(props: AutocompletePartProps): JSX.Element {
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

/** Places the list under the field; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
function Positioner(props: AutocompletePartProps): JSX.Element {
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

/** The list of suggestions, drawn as a menu. It stays while its exit animation runs. */
function Content(props: AutocompletePartProps): JSX.Element {
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

/** A group's props: its `id`, and a part's. */
export interface AutocompleteItemGroupProps extends AutocompletePartProps {
    readonly id: string;
}

/** A group label's props: the `id` of the group it names, and a part's. */
export interface AutocompleteItemGroupLabelProps extends AutocompletePartProps {
    readonly htmlFor: string;
}

/** A group of suggestions, named by the ItemGroupLabel whose `htmlFor` is its `id`. */
function ItemGroup(props: AutocompleteItemGroupProps): JSX.Element {
    const { menu, api } = context.use("ItemGroup");
    return menu.render("itemGroup", {
        element: "div",
        machine: () => api().getItemGroupProps({ id: props.id }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "id"),
    });
}

/** A group's label. */
function ItemGroupLabel(props: AutocompleteItemGroupLabelProps): JSX.Element {
    const { menu, api } = context.use("ItemGroupLabel");
    return menu.render("itemGroupLabel", {
        element: "div",
        machine: () => api().getItemGroupLabelProps({ htmlFor: props.htmlFor }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "htmlFor"),
    });
}

/** A suggestion, drawn as a menu item; the highlighted one shows the hover state. */
function Item(props: AutocompleteItemProps): JSX.Element {
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

/** A suggestion's label. */
function ItemLabel(props: AutocompletePartProps): JSX.Element {
    const { menu, api } = context.use("ItemLabel");
    const { item } = itemContext.use("ItemLabel");
    return menu.render("itemLabel", {
        element: "span",
        machine: () => api().getItemTextProps({ item: item() }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The arrow the ready-made autocomplete shows unless given another. */
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
    const own = props.own;
    const container = props.slots("container");
    const leadingIcon = props.slots("leadingIcon");
    const prefixText = props.slots("prefixText");
    const suffixText = props.slots("suffixText");
    const input = props.slots("input");
    const label = props.slots("label");
    const trailingIcon = props.slots("trailingIcon");
    const supportingText = props.slots("supportingText");
    const groups = createMemo(() => selectItemGroups(matches()));
    const groupId = createUniqueId();
    const renderItems = (list: () => readonly AutocompleteItem[]) => (
        <For each={list()} keyed={(item: AutocompleteItem) => item.value}>
            {(item) => (
                <Item item={item()}>
                    <ItemLabel>{item().label}</ItemLabel>
                </Item>
            )}
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
            <Positioner>
                <Content>
                    <For each={groups()} keyed={false}>
                        {(group, index) => (
                            <Show
                                when={group().group}
                                fallback={renderItems(() => group().items)}
                            >
                                {(name) => (
                                    <ItemGroup id={`${groupId}-${index}`}>
                                        <ItemGroupLabel
                                            htmlFor={`${groupId}-${index}`}
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

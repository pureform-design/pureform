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
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    Fragment,
    type ReactNode,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { useFieldsetDisabled, useFormReset } from "../form";
import { DropDownArrow } from "../glyphs";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import type { PartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
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
    readonly api: combobox.Api<PropTypes>;
    /** The suggestions the typed text keeps, in the list's order. */
    readonly matches: readonly AutocompleteItem[];
    /** The supporting text's id, and the message it shows instead of its own. */
    readonly supportingTextId: string;
    readonly errorText: string | undefined;
    readonly setInput: (element: HTMLInputElement | null) => void;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
}

/** What a suggestion shares with its parts. */
interface ItemContextValue {
    readonly item: AutocompleteItem;
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
    readonly as?: ElementType | undefined;
    /** The list's own props, drawn as a menu: `testId`, `unstyled`, and `tokens` (the ready-made
     *  also takes `className`, `style`, and `slotProps` keyed by the menu's parts, an option's
     *  also by option, `MenuScopeInstances`). */
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

const NO_MENU_PROPS: MenuScopeProps = {};

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

const NO_ITEMS: readonly AutocompleteItem[] = [];

/** The autocomplete's root, a `<div>` around the field, the supporting text, and the list. */
function Root(props: AutocompleteRootProps): ReactNode {
    const id = useId();
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
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(input);
    // What the user typed, which the list filters by; every suggestion until then.
    const [typed, setTyped] = useState("");
    const [initialText] = useState(() => autocompleteInitialText(props));
    // A reset's text: the default's, or the label of the value the reset leaves (a controlled
    // value stays until its owner takes the change).
    const defaultText = autocompleteInitialText({
        items: props.items,
        defaultInputValue: inputValue.defaultValue,
        value: value.controlled ? value.value : undefined,
        defaultValue: value.defaultValue,
    });
    const items = props.items ?? NO_ITEMS;
    const matches = useMemo(
        () =>
            selectGroupedItems(autocompleteMatches(items, typed, props.filter)),
        [items, typed, props.filter],
    );
    const collection = useMemo(
        () =>
            combobox.collection<AutocompleteItem>({
                items: matches,
                ...SELECT_COLLECTION,
            }),
        [matches],
    );
    const resetTo = useRef<string | null | undefined>(undefined);
    const sources = useItemInteractionSources();
    const text = inputValue.machineProps;
    const service = useMachine(combobox.machine, {
        id,
        ...sources.machineProps,
        dir,
        collection,
        ...autocompleteMachineProps(props, fieldsetDisabled),
        ...selectValueProps({
            ...value.machineProps,
            // A reset reports its change itself (Zag sets the value a microtask later, past the
            // reset's reason), so Zag's own report of it is dropped.
            onValueChange: (details) => {
                if (resetTo.current !== undefined) {
                    const dropped = resetTo.current === details.value;
                    resetTo.current = undefined;
                    if (dropped) return;
                }
                value.machineProps.onValueChange(details);
            },
        }),
        ...text,
        defaultInputValue: initialText,
        onInputValueChange: (details: {
            inputValue: string;
            reason?: string | undefined;
        }) => {
            setTyped(autocompleteFilterText(details));
            text.onInputValueChange({ inputValue: details.inputValue });
        },
        ...open.machineProps,
    });
    const api = combobox.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    const resetText = () =>
        inputValue.reset(() =>
            service.send({
                type: "INPUT_VALUE.SET",
                value: defaultText ?? "",
                src: "script",
            }),
        );
    useFormReset(input, {
        resetsTo: inputValue.resetsTo ?? defaultText ?? "",
        onBeforeReset: () => {
            value.beforeReset();
            inputValue.beforeReset();
        },
        onReset: () => {
            const resetValue = toZagValue(value.defaultValue ?? null)!;
            // The machine's value now: this handler may be an earlier render's.
            const current = service.context.get("value") as string[];
            if (resetValue.join() === current.join()) return resetText();
            textAfterValue.current = true;
            const next = value.defaultValue ?? null;
            value.reset(() =>
                value.machineProps.onValueChange({ value: next }),
            );
            // A controlled value moves when its owner takes the change.
            if (value.controlled) return;
            resetTo.current = next;
            service.send({ type: "VALUE.SET", value: resetValue });
        },
    });
    // A new value rewrites the text in a microtask Zag queues once React commits it, so a reset
    // that changed the value puts the text back after that.
    const textAfterValue = useRef(false);
    const valueKey = api.value.join("\u0000");
    useEffect(() => {
        if (!textAfterValue.current) return;
        textAfterValue.current = false;
        queueMicrotask(resetText);
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs when the value changes (by its key); resetText is this render's
    }, [valueKey]);
    // An error blocks submitting, as the input's custom validity.
    useEffect(() => {
        input?.setCustomValidity(props.error ?? "");
    }, [input, props.error]);
    const scope = useComponent(autocompleteAnatomy, {
        selection: autocompleteSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const menuProps = props.menuProps ?? NO_MENU_PROPS;
    const menu = useComponent(autocompleteMenuAnatomy, {
        selection: {
            ...autocompleteMenuSelection(props),
            tokens: menuProps.tokens,
        },
        testId:
            menuProps.testId ??
            (typeof props.testId === "string" ? props.testId : undefined),
        unstyled: menuProps.unstyled as Unstyled<PartName<MenuAnatomy>>,
        indication: props.indication,
    });
    const {
        as,
        menuProps: _menuProps,
        ...rest
    } = omitProps(props, AUTOCOMPLETE_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                menu,
                api,
                matches,
                supportingTextId: autocompleteSupportingTextId(props, id),
                errorText: props.error || undefined,
                setInput,
                sources,
                presence,
            }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The filled or outlined box holding the icons, the input, and the label. */
function Container({ unstyled, ...props }: AutocompletePartProps): ReactNode {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: api.getControlProps(),
        unstyled,
        props,
    });
}

/** The combobox: an `<input>` whose text filters the suggestions. The arrow keys move through
 *  them, Enter chooses one, and Escape closes the list. */
function Input({ unstyled, ...props }: AutocompletePartProps): ReactNode {
    const { scope, api, setInput } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: api.getInputProps(),
        ref: setInput as (element: HTMLElement | null) => void,
        unstyled,
        props,
    });
}

const field = selectFieldParts(
    context as unknown as PartContext<SelectFieldContext>,
    itemContext,
);

/** The floating label. */
const Label: (props: AutocompletePartProps) => ReactNode = field.Label;

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon: (props: AutocompleteIconProps) => ReactNode =
    field.LeadingIcon;

/** Text before the input's, shown once the label floats. Turn on Root's `prefixText` with it. */
const PrefixText: (props: AutocompletePartProps) => ReactNode =
    field.PrefixText;
/** Text after the input's, shown once the label floats. Turn on Root's `suffixText` with it. */
const SuffixText: (props: AutocompletePartProps) => ReactNode =
    field.SuffixText;

/** Helper text under the field. With an `error`, it shows the error instead. */
const SupportingText: (props: AutocompletePartProps) => ReactNode =
    field.SupportingText;

/** Places the list under the field; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
const Positioner: (props: AutocompletePartProps) => ReactNode =
    field.Positioner;

/** The list of suggestions, drawn as a menu. It stays while its exit animation runs. */
const Content: (props: AutocompletePartProps) => ReactNode = field.Content;

/** The arrow at the end, which opens or closes the list and turns over while it's open. It
 *  isn't in the tab order: the input has the keys. */
function TrailingIcon({
    unstyled,
    mirror,
    ...props
}: AutocompleteIconProps): ReactNode {
    const { scope, api } = context.use("TrailingIcon");
    return scope.render("trailingIcon", {
        element: "span",
        machine: autocompleteTriggerProps(api.getTriggerProps()),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** A group's props: its `id`, which its label points at, and a part's. */
export interface AutocompleteItemGroupProps extends AutocompletePartProps {
    readonly id: string;
}

/** A group label's props: the `id` of its group, and a part's. */
export interface AutocompleteItemGroupLabelProps extends Omit<
    AutocompletePartProps,
    "id"
> {
    readonly group: string;
}

/** A group of suggestions, labelled by the ItemGroupLabel with its `id` as `group`. */
const ItemGroup: (props: AutocompleteItemGroupProps) => ReactNode =
    field.ItemGroup;

/** A group's label. */
const ItemGroupLabel: (props: AutocompleteItemGroupLabelProps) => ReactNode =
    field.ItemGroupLabel;

/** A suggestion, drawn as a menu item; the highlighted one shows the hover state. */
const Item: (props: AutocompleteItemProps) => ReactNode = field.Item;

/** A suggestion's label. */
const ItemLabel: (props: AutocompletePartProps) => ReactNode = field.ItemLabel;

/** The ready-made autocomplete's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by the field's parts, and the label, supporting text, and icons as content. `aria-label`,
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
        SelectContentProps<ReactNode> {}

// Inside Root, so it can read whether an error shows and the suggestions.
function ReadyMadeContent({
    own,
}: {
    readonly own: AutocompleteProps;
}): ReactNode {
    const { matches, supportingTextId, errorText } = context.use("Root");
    const slot = useSlotProps(own);
    const menuSlot = useSlotProps<
        MenuAnatomy,
        never,
        MenuScopeInstances<AutocompleteItem>
    >(own.menuProps ?? NO_MENU_PROPS);
    const each = menuSlot.each("item") || menuSlot.each("itemLabel");
    let drawn = 0;
    const showsSupporting =
        isPresent(own.supportingText) || errorText !== undefined;
    return (
        <>
            <Container {...slot("container")}>
                {isPresent(own.leadingIcon) ? (
                    <LeadingIcon {...slot("leadingIcon")}>
                        {own.leadingIcon}
                    </LeadingIcon>
                ) : null}
                {isPresent(own.prefixText) ? (
                    <PrefixText {...slot("prefixText")}>
                        {own.prefixText}
                    </PrefixText>
                ) : null}
                <Input
                    aria-label={own["aria-label"]}
                    aria-labelledby={own["aria-labelledby"]}
                    aria-describedby={
                        own["aria-describedby"] ??
                        (showsSupporting ? supportingTextId : undefined)
                    }
                    {...slot("input")}
                />
                {isPresent(own.suffixText) ? (
                    <SuffixText {...slot("suffixText")}>
                        {own.suffixText}
                    </SuffixText>
                ) : null}
                <Label {...slot("label")}>{own.label}</Label>
                <TrailingIcon {...slot("trailingIcon")}>
                    {isPresent(own.trailingIcon) ? (
                        own.trailingIcon
                    ) : (
                        <DropDownArrow />
                    )}
                </TrailingIcon>
            </Container>
            {showsSupporting ? (
                <SupportingText {...slot("supportingText")}>
                    {own.supportingText}
                </SupportingText>
            ) : null}
            <Positioner {...menuSlot("positioner")}>
                <Content {...menuSlot("root")}>
                    {selectItemGroups(matches).map(({ group, items: run }) => {
                        const options = run.map((item) => {
                            const index = drawn++;
                            const copy = each ? { index, item } : undefined;
                            return (
                                <Item
                                    key={item.value}
                                    item={item}
                                    {...menuSlot("item", copy)}
                                >
                                    <ItemLabel {...menuSlot("itemLabel", copy)}>
                                        {item.label}
                                    </ItemLabel>
                                </Item>
                            );
                        });
                        return group === undefined ? (
                            <Fragment key={`-${run[0]!.value}`}>
                                {options}
                            </Fragment>
                        ) : (
                            <ItemGroup
                                key={group}
                                {...menuSlot("itemGroup")}
                                id={group}
                            >
                                <ItemGroupLabel
                                    group={group}
                                    {...menuSlot("itemGroupLabel")}
                                >
                                    {group}
                                </ItemGroupLabel>
                                {options}
                            </ItemGroup>
                        );
                    })}
                </Content>
            </Positioner>
        </>
    );
}

/** The ready-made autocomplete: the field in the preset's structure (the leading icon and
 *  supporting text only when given, or while an error shows) and the list of suggestions. */
function ReadyMade(props: AutocompleteProps): ReactNode {
    const slot = useSlotProps(props);
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        "aria-label": _ariaLabel,
        "aria-labelledby": _ariaLabelledBy,
        "aria-describedby": _ariaDescribedBy,
        label: _label,
        supportingText: _supportingText,
        leadingIcon,
        trailingIcon: _trailingIcon,
        prefixText,
        suffixText,
        ...rootProps
    } = props;
    return (
        <Root
            {...rootProps}
            leadingIcon={isPresent(leadingIcon) || undefined}
            prefixText={isPresent(prefixText) || undefined}
            suffixText={isPresent(suffixText) || undefined}
            // The root's slot props are an element's, whose `defaultValue` takes more types.
            {...(slot("root") as object)}
        >
            <ReadyMadeContent own={props} />
        </Root>
    );
}

/** Material's autocomplete (an editable exposed dropdown menu). Use it ready-made,
 *  `<Autocomplete label="City" name="city" items={[{ value: "paris", label: "Paris" }, …]} />`,
 *  or compose its parts under `Autocomplete.Root`: `Container` holding `LeadingIcon`,
 *  `PrefixText`, `Input`, `SuffixText`, `Label`, and `TrailingIcon`, then `SupportingText` and
 *  `Positioner` holding `Content`, with an `Item` (holding an `ItemLabel`) per suggestion; an
 *  `ItemGroup` holds an `ItemGroupLabel` and its suggestions. */
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

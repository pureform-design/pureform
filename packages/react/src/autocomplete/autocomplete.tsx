// The autocomplete: Root on Zag's combobox machine, the field's parts as the preset draws them (an
// editable combobox `<input>` in the text field's container, the arrow as its trailing icon), the
// suggestions the typed text keeps, drawn as a menu, and the ready-made Autocomplete over them.
// The input submits its text. The binding owns the form reset and the fieldset rule.

import {
    autocompleteAnatomy,
    autocompleteMenuAnatomy,
} from "@pureform/anatomy";
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
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

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
    const menu = useComponent(autocompleteMenuAnatomy, {
        selection: autocompleteMenuSelection(props),
        testId: typeof props.testId === "string" ? props.testId : undefined,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, AUTOCOMPLETE_ROOT_PROPS);
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

/** The floating label. */
function Label({ unstyled, ...props }: AutocompletePartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "label",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
function LeadingIcon({
    unstyled,
    mirror,
    ...props
}: AutocompleteIconProps): ReactNode {
    const { scope } = context.use("LeadingIcon");
    return scope.render("leadingIcon", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

const affix = (part: "prefixText" | "suffixText", name: string) =>
    function Affix({ unstyled, ...props }: AutocompletePartProps): ReactNode {
        const { scope } = context.use(name);
        return scope.render(part, { element: "span", unstyled, props });
    };

/** Text before the input's, shown once the label floats. Turn on Root's `prefixText` with it. */
const PrefixText = affix("prefixText", "PrefixText");
/** Text after the input's, shown once the label floats. Turn on Root's `suffixText` with it. */
const SuffixText = affix("suffixText", "SuffixText");

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

/** Helper text under the field. With an `error`, it shows the error instead. */
function SupportingText({
    unstyled,
    ...props
}: AutocompletePartProps): ReactNode {
    const { scope, supportingTextId, errorText } =
        context.use("SupportingText");
    return scope.render("supportingText", {
        element: "span",
        machine: { id: supportingTextId },
        unstyled,
        props: { ...props, children: errorText ?? props.children },
    });
}

/** Places the list under the field; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
function Positioner({ unstyled, ...props }: AutocompletePartProps): ReactNode {
    const { menu, api, presence } = context.use("Positioner");
    return menu.render("positioner", {
        element: "div",
        machine: selectPositionerProps(
            api.getPositionerProps(),
            presence.present,
        ),
        unstyled,
        props,
    });
}

/** The list of suggestions, drawn as a menu. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: AutocompletePartProps): ReactNode {
    const { menu, api, presence } = context.use("Content");
    return menu.render("root", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(api.getContentProps(), presence.present),
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
function ItemGroup({
    unstyled,
    id,
    ...props
}: AutocompleteItemGroupProps): ReactNode {
    const { menu, api } = context.use("ItemGroup");
    return menu.render("itemGroup", {
        element: "div",
        machine: api.getItemGroupProps({ id }),
        unstyled,
        props,
    });
}

/** A group's label. */
function ItemGroupLabel({
    unstyled,
    group,
    ...props
}: AutocompleteItemGroupLabelProps): ReactNode {
    const { menu, api } = context.use("ItemGroupLabel");
    return menu.render("itemGroupLabel", {
        element: "div",
        machine: api.getItemGroupLabelProps({ htmlFor: group }),
        unstyled,
        props,
    });
}

/** A suggestion, drawn as a menu item; the highlighted one shows the hover state. */
function Item({ unstyled, item, ...props }: AutocompleteItemProps): ReactNode {
    const { menu, api, sources } = context.use("Item");
    const source = sources.item(item.value, item.interactionSource);
    return (
        <itemContext.Provider value={{ item }}>
            {menu.render("item", {
                element: "div",
                interactionSource: source,
                machine: api.getItemProps({ item }),
                states: { hover: api.getItemState({ item }).highlighted },
                unstyled,
                props,
            })}
        </itemContext.Provider>
    );
}

/** A suggestion's label. */
function ItemLabel({ unstyled, ...props }: AutocompletePartProps): ReactNode {
    const { menu, api } = context.use("ItemLabel");
    const { item } = itemContext.use("ItemLabel");
    return menu.render("itemLabel", {
        element: "span",
        machine: api.getItemTextProps({ item }),
        unstyled,
        props,
    });
}

/** The arrow the ready-made autocomplete shows unless given another. */
const DropDownArrow = (): ReactNode => (
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
            <Positioner>
                <Content>
                    {selectItemGroups(matches).map(({ group, items: run }) => {
                        const options = run.map((item) => (
                            <Item key={item.value} item={item}>
                                <ItemLabel>{item.label}</ItemLabel>
                            </Item>
                        ));
                        return group === undefined ? (
                            <Fragment key={`-${run[0]!.value}`}>
                                {options}
                            </Fragment>
                        ) : (
                            <ItemGroup key={group} id={group}>
                                <ItemGroupLabel group={group}>
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

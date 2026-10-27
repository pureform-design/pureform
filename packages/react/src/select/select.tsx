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
    SELECT_ROOT_PROPS,
    selectGroupedItems,
    selectItemGroups,
    selectMenuSelection,
    selectSelection,
    selectSupportingTextId,
} from "@pureform/binding-core";
import type {
    Direction,
    InnerProps,
    MenuScopeInstances,
    SelectContentProps,
    SelectItem,
    SelectRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import {
    selectHiddenSelectProps,
    selectInputProps,
    selectMachineProps,
    selectValueProps,
    toZagValue,
} from "@pureform/binding-web";
import * as select from "@pureform/machines/select";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    Fragment,
    type ReactNode,
    useCallback,
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

type Anatomy = typeof selectAnatomy;
type MenuAnatomy = typeof selectMenuAnatomy;

/** What Root shares with its parts. */
interface SelectContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly menu: ComponentScope<MenuAnatomy>;
    readonly api: select.Api<PropTypes>;
    readonly dir: Direction;
    readonly items: readonly SelectItem[];
    /** The supporting text's id, and the message it shows instead of its own. */
    readonly supportingTextId: string;
    readonly errorText: string | undefined;
    readonly setHiddenSelect: (element: HTMLSelectElement | null) => void;
    readonly sources: ItemInteractionSources;
    readonly presence: Presence;
}

/** What an option shares with its parts. */
interface ItemContextValue {
    readonly item: SelectItem;
}

const context = createPartContext<SelectContextValue>("Select");
const itemContext = createPartContext<ItemContextValue>("Select", "Item");

/** Root's props: the variants and tokens, the machine's props (`items`, `value`, `open`, `name`,
 *  …), `testId` and `unstyled` for the field's parts, `as`, and the element's own props. */
export interface SelectRootProps
    extends Omit<PartProps, keyof SelectRootOwnProps>, SelectRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
    /** The list's own props, drawn as a menu: `testId`, `unstyled`, and `tokens` (the ready-made
     *  also takes `className`, `style`, and `slotProps` keyed by the menu's parts, an option's
     *  also by option, `MenuScopeInstances`). */
    readonly menuProps?: SelectMenuProps | undefined;
}

/** The select's list's own props, keyed by the menu's parts (an option's also by option). */
export type SelectMenuProps = Omit<
    InnerPropsOf<MenuAnatomy>,
    keyof SlotKeyedProps<MenuAnatomy>
> &
    InnerProps<
        SlotKeyedProps<MenuAnatomy, never, MenuScopeInstances<SelectItem>>
    >;

const NO_MENU_PROPS: SelectMenuProps = {};

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

const NO_ITEMS: readonly SelectItem[] = [];

/** The select's root, a `<div>` around the field, the supporting text, the hidden select, and
 *  the list. */
function Root(props: SelectRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string | null>(
        "Select",
        "value",
        props,
    );
    const open = useControllable<"open", boolean>("Select", "open", props);
    const [hidden, setHidden] = useState<HTMLSelectElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(hidden);
    const items = props.items ?? NO_ITEMS;
    const collection = useMemo(
        () =>
            select.collection<SelectItem>({
                items: selectGroupedItems(items),
                ...SELECT_COLLECTION,
            }),
        [items],
    );
    const sources = useItemInteractionSources();
    const service = useMachine(select.machine, {
        id,
        ...sources.machineProps,
        dir,
        collection,
        ...selectMachineProps(props, fieldsetDisabled),
        ...selectValueProps(value.machineProps),
        ...open.machineProps,
    });
    const api = select.connect(service, normalizeProps);
    const presence = usePresence(api.open);
    useFormReset(hidden, {
        resetsTo: value.resetsTo ?? null,
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
    useEffect(() => {
        hidden?.setCustomValidity(props.error ?? "");
    }, [hidden, props.error]);
    const scope = useComponent(selectAnatomy, {
        selection: selectSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const menuProps = props.menuProps ?? NO_MENU_PROPS;
    const menu = useComponent(selectMenuAnatomy, {
        selection: {
            ...selectMenuSelection(props),
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
    } = omitProps(props, SELECT_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                menu,
                api,
                dir,
                items,
                supportingTextId: selectSupportingTextId(props, id),
                errorText: props.error || undefined,
                setHiddenSelect: setHidden,
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
function Container({ unstyled, ...props }: SelectPartProps): ReactNode {
    const { scope, api } = context.use("Container");
    return scope.render("container", {
        element: "div",
        machine: api.getControlProps(),
        unstyled,
        props,
    });
}

/** The combobox: a read-only `<input>` showing the chosen option, which opens the list on a
 *  click, Enter, Space, or an arrow key, and changes the value with the arrow keys sideways. */
function Input({ unstyled, ...props }: SelectPartProps): ReactNode {
    const { scope, api, dir } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: selectInputProps(
            api.getTriggerProps(),
            api.valueAsString,
            dir,
        ),
        unstyled,
        props,
    });
}

const field = selectFieldParts(
    context as unknown as PartContext<SelectFieldContext>,
    itemContext,
);

/** The floating label. */
const Label: (props: SelectPartProps) => ReactNode = field.Label;

/** An icon at the start of the field. Turn on Root's `leadingIcon` with it. */
const LeadingIcon: (props: SelectIconProps) => ReactNode = field.LeadingIcon;

/** Text before the value, shown once the label floats. Turn on Root's `prefixText` with it. */
const PrefixText: (props: SelectPartProps) => ReactNode = field.PrefixText;
/** Text after the value, shown once the label floats. Turn on Root's `suffixText` with it. */
const SuffixText: (props: SelectPartProps) => ReactNode = field.SuffixText;

/** Helper text under the field. With an `error`, it shows the error instead. */
const SupportingText: (props: SelectPartProps) => ReactNode =
    field.SupportingText;

/** Places the list under the field; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
const Positioner: (props: SelectPartProps) => ReactNode = field.Positioner;

/** The list of options, drawn as a menu. It stays while its exit animation runs. */
const Content: (props: SelectPartProps) => ReactNode = field.Content;

/** The arrow at the end, which turns over while the list is open. */
function TrailingIcon({
    unstyled,
    mirror,
    ...props
}: SelectIconProps): ReactNode {
    const { scope, api } = context.use("TrailingIcon");
    return scope.render("trailingIcon", {
        element: "span",
        machine: api.getIndicatorProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The hidden native `<select>`, with an option per item: it submits the value, resets, validates
 *  `required`, and takes autofill. The registry doesn't style it. */
function HiddenSelect({ unstyled, ...props }: SelectPartProps): ReactNode {
    const { scope, api, items, setHiddenSelect } = context.use("HiddenSelect");
    // A select shows its first option until told otherwise, and Zag's machine only clears it once
    // it starts; with no value, nothing is selected from the start, so `required` holds. The
    // callback reads the value through a ref: a new callback would detach and reattach the select
    // as the value empties or fills, setting Root's state and rendering it again.
    const empty = useRef(false);
    empty.current = api.value.length === 0;
    const ref = useCallback(
        (element: HTMLElement | null) => {
            if (element instanceof HTMLSelectElement && empty.current)
                element.selectedIndex = -1;
            setHiddenSelect(element as HTMLSelectElement | null);
        },
        [setHiddenSelect],
    );
    return scope.render("hiddenSelect", {
        element: "select",
        machine: selectHiddenSelectProps(api.getHiddenSelectProps()),
        ref,
        unstyled,
        props: {
            ...props,
            children: items.map((item) => (
                <option
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                >
                    {item.label}
                </option>
            )),
        },
    });
}

/** A group's props: its `id`, which its label points at, and a part's. */
export interface SelectItemGroupProps extends SelectPartProps {
    readonly id: string;
}

/** A group label's props: the `id` of its group, and a part's. */
export interface SelectItemGroupLabelProps extends Omit<SelectPartProps, "id"> {
    readonly group: string;
}

/** A group of options, labelled by the ItemGroupLabel with its `id` as `group`. */
const ItemGroup: (props: SelectItemGroupProps) => ReactNode = field.ItemGroup;

/** A group's label. */
const ItemGroupLabel: (props: SelectItemGroupLabelProps) => ReactNode =
    field.ItemGroupLabel;

/** An option, drawn as a menu item; the highlighted one shows the hover state. */
const Item: (props: SelectItemProps) => ReactNode = field.Item;

/** An option's label. */
const ItemLabel: (props: SelectPartProps) => ReactNode = field.ItemLabel;

/** The ready-made select's props: Root's, with `className`, `style`, and `slotProps` keyed by the
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
        SelectContentProps<ReactNode> {}

// Inside Root, so it can read whether an error shows and the options.
function ReadyMadeContent({ own }: { readonly own: SelectProps }): ReactNode {
    const { items, supportingTextId, errorText } = context.use("Root");
    const slot = useSlotProps(own);
    const menuSlot = useSlotProps<
        MenuAnatomy,
        never,
        MenuScopeInstances<SelectItem>
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
            <HiddenSelect {...slot("hiddenSelect")} />
            <Positioner {...menuSlot("positioner")}>
                <Content {...menuSlot("root")}>
                    {selectItemGroups(items).map(({ group, items: run }) => {
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

/** The ready-made select: the field in the preset's structure (the leading icon and supporting
 *  text only when given, or while an error shows), the hidden select, and the list, its options
 *  under their group labels. */
function ReadyMade(props: SelectProps): ReactNode {
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

/** Material's select. Use it ready-made, `<Select label="Size" name="size" items={[{ value: "s",
 *  label: "Small" }, …]} />`, or compose its parts under `Select.Root`: `Container` holding
 *  `LeadingIcon`, `PrefixText`, `Input`, `SuffixText`, `Label`, and `TrailingIcon`, then
 *  `SupportingText`, `HiddenSelect`, and `Positioner` holding `Content`, with an `Item` (holding an
 *  `ItemLabel`) per option; an `ItemGroup` holds an `ItemGroupLabel` and its options. */
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

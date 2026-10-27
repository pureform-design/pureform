// The accordion: Root on Zag's accordion machine (the preset's root, a column of items); each item
// a tile holding its header (a button: an optional leading icon, its text, a title over an optional
// description, and the expand indicator) and its content, which Zag hides while the item is
// collapsed; and the ready-made Accordion over them.

import { accordionAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    ACCORDION_ROOT_PROPS,
    accordionItemProps,
    accordionSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    AccordionContentProps,
    AccordionInstances,
    AccordionItem,
    AccordionItemInstance,
    AccordionRootOwnProps,
    InteractionSourceProps,
} from "@pureform/binding-core";
import { accordionMachineProps } from "@pureform/binding-web";
import * as accordion from "@pureform/machines/accordion";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { useControllable } from "../controllable";
import { ExpandIcon } from "../glyphs";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { collapsible } from "../motion";
import { createPartContext } from "../part-context";
import { plainParts, useComponent, useSlotProps } from "../parts";
import type {
    ComponentScope,
    PlainPartProps,
    SlotKeyedProps,
    SlotPropsOf,
} from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof accordionAnatomy;

/** What Root shares with its parts. */
interface AccordionContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: accordion.Api<PropTypes>;
    readonly disabled: boolean | undefined;
    readonly sources: ItemInteractionSources;
}

/** What an item shares with its parts. */
interface ItemContextValue {
    readonly props: { value: string; disabled: boolean };
}

const context = createPartContext<AccordionContextValue>("Accordion");
const itemContext = createPartContext<ItemContextValue>("Accordion", "Item");

/** Root's props: the variants and tokens, the machine's props (`value`, `multiple`, …), `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface AccordionRootProps
    extends
        Omit<PartProps, keyof AccordionRootOwnProps>,
        AccordionRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type AccordionPartProps = PlainPartProps;

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export interface AccordionIconProps extends AccordionPartProps {
    readonly mirror?: boolean | undefined;
}

/** An item's props: its value, `disabled`, and a part's. */
export interface AccordionItemProps extends AccordionPartProps {
    readonly value: string;
    readonly disabled?: boolean | undefined;
}

/** A header's props: a part's, and the item's interaction source. */
export interface AccordionTriggerProps
    extends AccordionPartProps, InteractionSourceProps {}

/** The accordion's root, a `<div>` around its items. */
function Root(props: AccordionRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string[]>(
        "Accordion",
        "value",
        props,
    );
    const sources = useItemInteractionSources();
    const service = useMachine(accordion.machine, {
        id,
        ...sources.machineProps,
        dir,
        ...accordionMachineProps(props),
        ...value.machineProps,
    });
    const api = accordion.connect(service, normalizeProps);
    const scope = useComponent(accordionAnatomy, {
        selection: accordionSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, ACCORDION_ROOT_PROPS);
    return (
        <context.Provider
            value={{ scope, api, disabled: props.disabled, sources }}
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

/** An item: a tile around its header and content. */
function Item({
    unstyled,
    value,
    disabled,
    ...props
}: AccordionItemProps): ReactNode {
    const { scope, api, disabled: all } = context.use("Item");
    const item = accordionItemProps({ value, disabled }, all);
    return (
        <itemContext.Provider value={{ props: item }}>
            {scope.render("item", {
                element: "div",
                machine: api.getItemProps(item),
                unstyled,
                props,
            })}
        </itemContext.Provider>
    );
}

/** An item's header: a button that expands and collapses it. The arrow keys move between the
 *  headers, and Home and End go to the first and last. */
function Trigger({
    unstyled,
    interactionSource,
    ...props
}: AccordionTriggerProps): ReactNode {
    const { scope, api, sources } = context.use("Trigger");
    const { props: item } = itemContext.use("Trigger");
    const source = sources.item(item.value, interactionSource);
    return scope.render("trigger", {
        element: "button",
        interactionSource: source,
        machine: api.getItemTriggerProps(item),
        unstyled,
        props,
    });
}

/** An item's content, which Zag hides while the item is collapsed. */
function Content({ unstyled, ...props }: AccordionPartProps): ReactNode {
    const { scope, api } = context.use("Content");
    const { props: item } = itemContext.use("Content");
    return scope.render("content", {
        element: "div",
        ref: collapsible,
        machine: api.getItemContentProps(item),
        unstyled,
        props,
    });
}

/** An icon before the text, hidden from assistive technology. */
function Leading({
    unstyled,
    mirror,
    ...props
}: AccordionIconProps): ReactNode {
    const { scope } = context.use("Leading");
    return scope.render("leading", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The expand indicator, hidden from assistive technology, turned over while the item is
 *  expanded. Without children it shows Material's chevron. */
function Indicator({
    unstyled,
    children,
    ...props
}: AccordionPartProps): ReactNode {
    const { scope, api } = context.use("Indicator");
    const { props: item } = itemContext.use("Indicator");
    return scope.render("indicator", {
        element: "span",
        machine: api.getItemIndicatorProps(item),
        unstyled,
        props: { ...props, children: children ?? <ExpandIcon /> },
    });
}

const plain = plainParts<Anatomy>((name) => context.use(name), "span");

/** The header's text: the title over the description. */
const Text = plain("text", "Text");
/** The header's title. */
const Title = plain("title", "Title");
/** A line under the title. */
const Description = plain("description", "Description");

/** The ready-made accordion's props: Root's, with `className`, `style`, `slotProps` and
 *  `unstyled` keyed by part (an item's parts also by item, `AccordionItemInstance`), and the items
 *  as data. */
export interface AccordionProps
    extends
        Omit<AccordionRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, AccordionInstances<ReactNode>>,
        AccordionContentProps<ReactNode> {}

type Slot = SlotPropsOf<PartName<Anatomy>, AccordionInstances<ReactNode>>;

const ITEM_PARTS = [
    "item",
    "trigger",
    "leading",
    "text",
    "title",
    "description",
    "indicator",
    "content",
] as const;

/** The ready-made accordion: an item per entry of `items`, its header showing its leading icon,
 *  title, description and the indicator, and its content. */
function ReadyMade(props: AccordionProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        items = [],
        ...rootProps
    } = props;
    const slot = useSlotProps<Anatomy, never, AccordionInstances<ReactNode>>(
        props,
    );
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <Items items={items} slotOf={slot} />
        </Root>
    );
}

// The ready-made's items, under Root, which knows which are expanded.
function Items(props: {
    readonly items: readonly AccordionItem<ReactNode>[];
    readonly slotOf: Slot;
}): ReactNode {
    const { api } = context.use("Accordion");
    const slot = props.slotOf;
    const each = ITEM_PARTS.some((part) => slot.each(part));
    return props.items.map((item, index) => {
        const entry: AccordionItemInstance<ReactNode> | undefined = each
            ? { index, item, expanded: api.value.includes(item.value) }
            : undefined;
        return (
            <Item
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                {...slot("item", entry)}
            >
                <Trigger
                    interactionSource={item.interactionSource}
                    {...slot("trigger", entry)}
                >
                    {isPresent(item.leading) ? (
                        <Leading
                            mirror={item.mirrorLeading}
                            {...slot("leading", entry)}
                        >
                            {item.leading}
                        </Leading>
                    ) : null}
                    <Text {...slot("text", entry)}>
                        <Title {...slot("title", entry)}>{item.title}</Title>
                        {isPresent(item.description) ? (
                            <Description {...slot("description", entry)}>
                                {item.description}
                            </Description>
                        ) : null}
                    </Text>
                    <Indicator {...slot("indicator", entry)} />
                </Trigger>
                <Content {...slot("content", entry)}>{item.content}</Content>
            </Item>
        );
    });
}

/** Expansion panels, as Angular Material calls them, drawn as Material list rows. Use it
 *  ready-made, `<Accordion items={[{ value: "a", title: "Shipping", content: … }, …]} />`, or
 *  compose its parts under `Accordion.Root`: an `Item` per item holding a `Trigger` (with
 *  `Leading`, `Text` around `Title` and `Description`, and `Indicator`) and a `Content`. */
export const Accordion = Object.assign(ReadyMade, {
    Root,
    Item,
    Trigger,
    Leading,
    Text,
    Title,
    Description,
    Indicator,
    Content,
});

// The accordion: Root on Zag's accordion machine (the preset's root, a column of items); each item
// a tile holding its header (a button: an optional leading icon, its text, a title over an optional
// description, and the expand indicator) and its content, which Zag hides while the item is
// collapsed; and the ready-made Accordion over them.

import { accordionAnatomy } from "@pureform/anatomy";
import {
    ACCORDION_CONTENT_PROPS,
    ACCORDION_ROOT_PROPS,
    accordionItemProps,
    accordionMachineProps,
    accordionSelection,
} from "@pureform/binding-core";
import type {
    AccordionContentProps,
    AccordionItem,
    AccordionRootOwnProps,
    InteractionSourceProps,
} from "@pureform/binding-core";
import * as accordion from "@pureform/machines/accordion";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    merge,
    omit,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { ExpandIcon } from "../glyphs";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { useCollapsible } from "../motion";
import { createPartContext } from "../part-context";
import {
    createSlotProps,
    iconParts,
    optionalPart,
    plainParts,
    useComponent,
    whenPresent,
} from "../parts";
import type {
    ComponentScope,
    IconPartProps,
    PlainPartProps,
    SlotKeyedProps,
} from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof accordionAnatomy;

/** What Root shares with its parts. */
interface AccordionContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<accordion.Api<PropTypes>>;
    readonly disabled: Accessor<boolean | undefined>;
    readonly sources: ItemInteractionSources;
}

/** What an item shares with its parts. */
interface ItemContextValue {
    readonly props: Accessor<{ value: string; disabled: boolean }>;
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
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type AccordionPartProps = PlainPartProps;

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export type AccordionIconProps = IconPartProps;

/** An item's props: its value, `disabled`, and a part's. */
export interface AccordionItemProps extends AccordionPartProps {
    readonly value: string;
    readonly disabled?: boolean | undefined;
}

/** A header's props: a part's, and the item's interaction source. */
export interface AccordionTriggerProps
    extends AccordionPartProps, InteractionSourceProps {}

/** The accordion's root, a `<div>` around its items. */
function Root(props: AccordionRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string[]>(
        "Accordion",
        "value",
        props,
    );
    const sources = itemInteractionSources();
    const service = useMachine(accordion.machine, () => ({
        id,
        ...sources.machineProps,
        dir: dir(),
        ...accordionMachineProps(props),
        ...value.machineProps(),
    }));
    const api = createMemo(() => accordion.connect(service, normalizeProps));
    const scope = useComponent(accordionAnatomy, {
        selection: () => accordionSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    return (
        <context.Provider
            value={{ scope, api, disabled: () => props.disabled, sources }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...ACCORDION_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** An item: a tile around its header and content. */
function Item(props: AccordionItemProps): JSX.Element {
    const { scope, api, disabled } = context.use("Item");
    const item = () => accordionItemProps(props, disabled());
    return (
        <itemContext.Provider value={{ props: item }}>
            {scope.render("item", {
                element: "div",
                machine: () => api().getItemProps(item()),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", "value", "disabled"),
            })}
        </itemContext.Provider>
    );
}

/** An item's header: a button that expands and collapses it. The arrow keys move between the
 *  headers, and Home and End go to the first and last. */
function Trigger(props: AccordionTriggerProps): JSX.Element {
    const { scope, api, sources } = context.use("Trigger");
    const { props: item } = itemContext.use("Trigger");
    const source = sources.item(
        () => item().value,
        () => props.interactionSource,
    );
    return scope.render("trigger", {
        element: "button",
        interactionSource: source,
        machine: () => api().getItemTriggerProps(item()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "interactionSource"),
    });
}

/** An item's content, which Zag hides while the item is collapsed. */
function Content(props: AccordionPartProps): JSX.Element {
    const { scope, api } = context.use("Content");
    const { props: item } = itemContext.use("Content");
    return scope.render("content", {
        element: "div",
        ref: useCollapsible(),
        machine: () => api().getItemContentProps(item()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

const leading = iconParts<Anatomy, AccordionIconProps>(
    (use) => ({
        scope: context.use(use).scope,
        machine: () => ({ "aria-hidden": "true" }),
    }),
    "Leading",
    "leading",
    { mirror: true },
);

/** The expand indicator, hidden from assistive technology, turned over while the item is
 *  expanded. Without children it shows Material's chevron. */
function Indicator(props: AccordionPartProps): JSX.Element {
    const { scope, api } = context.use("Indicator");
    const { props: item } = itemContext.use("Indicator");
    return scope.render("indicator", {
        element: "span",
        machine: () => api().getItemIndicatorProps(item()),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return props.children ?? <ExpandIcon />;
            },
        }),
    });
}

const plain = plainParts<Anatomy>((name) => context.use(name), "span");

/** An icon before the text, hidden from assistive technology. */
const Leading = leading.Part;
/** The header's text: the title over the description. */
const Text = plain("text", "Text");
/** The header's title. */
const Title = plain("title", "Title");
/** A line under the title. */
const Description = plain("description", "Description");

/** The ready-made accordion's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and the items as data. */
export interface AccordionProps
    extends
        Omit<AccordionRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        AccordionContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...ACCORDION_CONTENT_PROPS,
] as const;

const OptionalDescription = whenPresent(Description);

/** The ready-made accordion: an item per entry of `items`, its header showing its leading icon,
 *  title, description and the indicator, and its content. */
function ReadyMade(props: AccordionProps): JSX.Element {
    const items = createMemo(() => props.items ?? []);
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as AccordionRootProps;
    const root = slots("root") as object;
    // Views, so every item reads the same ones.
    const item = slots("item") as object;
    const trigger = slots("trigger");
    const leadingSlot = slots("leading");
    const text = slots("text");
    const title = slots("title");
    const description = slots("description");
    const indicator = slots("indicator");
    const content = slots("content");
    return (
        <Root {...own} {...root}>
            <For
                each={items()}
                keyed={(entry: AccordionItem<JSX.Element>) => entry.value}
            >
                {(entry) => {
                    const LeadingPart = optionalPart(
                        untrack(entry),
                        "leading",
                        Leading,
                        leading.Optional,
                    );
                    return (
                        <Item
                            value={entry().value}
                            disabled={entry().disabled}
                            {...item}
                        >
                            <Trigger
                                interactionSource={entry().interactionSource}
                                {...trigger}
                            >
                                <LeadingPart
                                    mirror={entry().mirrorLeading}
                                    {...leadingSlot}
                                >
                                    {entry().leading}
                                </LeadingPart>
                                <Text {...text}>
                                    <Title {...title}>{entry().title}</Title>
                                    <OptionalDescription {...description}>
                                        {entry().description}
                                    </OptionalDescription>
                                </Text>
                                <Indicator {...indicator} />
                            </Trigger>
                            <Content {...content}>{entry().content}</Content>
                        </Item>
                    );
                }}
            </For>
        </Root>
    );
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

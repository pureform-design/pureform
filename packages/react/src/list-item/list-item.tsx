// The list item: Root, a row that's a `<div>`, a link (`href`), or a button (`as="button"`), with
// its leading part, text (overline, headline, supporting text), and trailing parts as the preset
// draws them; and the ready-made ListItem over them. It has no machine: the app marks it selected
// or disabled. Inside a List, it takes the list's variants as its defaults. An expandable item sits
// in `Expandable`, Zag's accordion with one item: Root is its header (a button, with an
// `Indicator`), and `Region`, after Root, its content.

import { listItemAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isInteractiveListItem,
    isPresent,
    LIST_ITEM_EXPAND_VALUE,
    listItemExpandMachineProps,
    LIST_ITEM_ROOT_PROPS,
    listItemElement,
    listItemLines,
    listItemRootProps,
    listItemSelection,
    listItemVariants,
} from "@pureform/binding-core";
import type {
    ListItemContentProps,
    ListItemExpandProps,
    ListItemPart,
    ListItemRootOwnProps,
    ListVariantProps,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import * as accordion from "@pureform/machines/accordion";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    createContext,
    type ElementType,
    type ReactNode,
    use,
    useId,
    useRef,
} from "react";

import { useControllable } from "../controllable";
import { ExpandIcon } from "../glyphs";
import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof listItemAnatomy;

/** What Root shares with its parts. */
interface ListItemContextValue {
    readonly scope: ComponentScope<Anatomy>;
}

const context = createPartContext<ListItemContextValue>("ListItem");

/** What `Expandable` shares with Root and Region. Root gives it its interaction source, which the
 *  machine's header emits to, as an accordion header's. */
interface ExpandContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: accordion.Api<PropTypes>;
    readonly root: { current: MutableInteractionSource | undefined };
}

const expandContext = createPartContext<ExpandContextValue>(
    "ListItem",
    "Expandable",
);
const expandItem = (disabled: boolean | undefined) => ({
    value: LIST_ITEM_EXPAND_VALUE,
    disabled,
});

/** The variants of the list around a list item: its defaults. Internal to the list. */
export const ListDefaults = createContext<ListVariantProps | null>(null);

/** Root's props: the variants and tokens, `selected` and `disabled`, `testId` and `unstyled` for
 *  every part, `href` (a link) or `as`, and the element's own props. */
export interface ListItemRootProps
    extends Omit<PartProps, keyof ListItemRootOwnProps>, ListItemRootOwnProps {
    /** Where the item leads: Root renders a link (`<a>`). */
    readonly href?: string | undefined;
    /** Another element or component to render instead of `<div>`: `"button"` for an item that
     *  acts. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface ListItemPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A leading or trailing part's props: a part's, and `mirror` to flip an icon under `rtl`. */
export interface ListItemIconProps extends ListItemPartProps {
    readonly mirror?: boolean | undefined;
}

/** The list item's root: the row. A link or a button is interactive: it takes the state layer and
 *  the focus ring. */
function Root(props: ListItemRootProps): ReactNode {
    const list = use(ListDefaults);
    const expand = use(expandContext.Provider);
    // An expandable item's header is a button, unless told otherwise.
    const element = listItemElement<ElementType>({
        href: props.href,
        as: props.as ?? (expand ? "button" : undefined),
    });
    // An expandable item's header: the accordion machine's, emitting to Root's source.
    const own = expand
        ? combinePartProps([
              listItemRootProps(props, element),
              expand.api.getItemTriggerProps(
                  expandItem(props.disabled),
              ) as Record<string, unknown>,
          ])
        : listItemRootProps(props, element);
    const interactive = isInteractiveListItem(
        listItemVariants(list, props),
        element,
    );
    const source = useOwnInteractionSource(props.interactionSource);
    if (expand) expand.root.current = source;
    const handlers = useInteractionHandlers(
        source,
        !!expand || !interactive || !!props.disabled,
    );
    const scope = useComponent(listItemAnatomy, {
        selection: listItemSelection(listItemVariants(list, props), element),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
        interactive,
    });
    const { as: _as, ...rest } = omitProps(props, LIST_ITEM_ROOT_PROPS);
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element,
                machine:
                    interactive && !expand
                        ? combinePartProps([own, handlers])
                        : own,
                props: rest,
            })}
        </context.Provider>
    );
}

const iconPart = (part: "leading" | "trailing", name: string) =>
    function IconPart({
        unstyled,
        mirror,
        ...props
    }: ListItemIconProps): ReactNode {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            machine: { "aria-hidden": "true" },
            states: { mirrored: mirror },
            unstyled,
            props,
        });
    };

const textPart = (
    part:
        | "content"
        | "overline"
        | "headline"
        | "supportingText"
        | "trailingText",
    name: string,
    element: "div" | "span",
) =>
    function TextPart({ unstyled, ...props }: ListItemPartProps): ReactNode {
        const { scope } = context.use(name);
        return scope.render(part, { element, unstyled, props });
    };

/** An icon, avatar, or image before the text, hidden from assistive technology (give it
 *  `aria-hidden={false}` when it says something). */
const Leading = iconPart("leading", "Leading");
/** The text: the overline, headline, and supporting text. */
const Content = textPart("content", "Content", "div");
/** A line above the headline. */
const Overline = textPart("overline", "Overline", "span");
/** The item's main text. */
const Headline = textPart("headline", "Headline", "span");
/** Text under the headline. */
const SupportingText = textPart("supportingText", "SupportingText", "span");
/** An icon after the text, hidden from assistive technology. */
const Trailing = iconPart("trailing", "Trailing");
/** Text after the text, such as a count. */
const TrailingText = textPart("trailingText", "TrailingText", "span");

/** An expandable item's indicator, after the text: a chevron (or its children) that turns over
 *  while the item is expanded, hidden from assistive technology. */
function Indicator({
    unstyled,
    children,
    ...props
}: ListItemPartProps): ReactNode {
    const { scope } = context.use("Indicator");
    return scope.render("indicator", {
        element: "span",
        machine: { "aria-hidden": "true" },
        unstyled,
        props: { ...props, children: children ?? <ExpandIcon /> },
    });
}

/** `Expandable`'s props: whether the item is expanded (controllable), the region's test ids, and
 *  Root and Region as children. */
export interface ListItemExpandableProps extends ListItemExpandProps {
    /** A prefix for its parts' test ids, or ids by part (Region's). */
    readonly testId?: TestIdOverride<ListItemPart> | undefined;
    readonly children?: ReactNode;
}

/** An expandable item: Zag's accordion with one item, around the item's Root (its header) and
 *  its Region. */
function Expandable(props: ListItemExpandableProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const list = use(ListDefaults);
    const root = useRef<MutableInteractionSource | undefined>(undefined);
    const controllable = useControllable<"expanded", boolean>(
        "ListItem",
        "expanded",
        props,
    );
    const service = useMachine(accordion.machine, {
        id,
        dir,
        itemInteractionSource: () => root.current as MutableInteractionSource,
        ...listItemExpandMachineProps(controllable.machineProps),
    });
    const api = accordion.connect(service, normalizeProps);
    const scope = useComponent(listItemAnatomy, {
        selection: listItemSelection(listItemVariants(list, {}), "button"),
        testId: props.testId,
    });
    return (
        <expandContext.Provider value={{ scope, api, root }}>
            {props.children}
        </expandContext.Provider>
    );
}

/** What an expandable item shows while expanded, after its Root: nested list items, say. Hidden
 *  while collapsed, named by Root. */
function Region({
    unstyled,
    children,
    ...props
}: ListItemPartProps): ReactNode {
    const { scope, api } = expandContext.use("Region");
    return scope.render("region", {
        element: "div",
        machine: api.getItemContentProps(expandItem(undefined)),
        unstyled,
        // The items inside are its content, not more headers.
        props: {
            ...props,
            children: (
                <expandContext.Provider value={null}>
                    {children}
                </expandContext.Provider>
            ),
        },
    });
}

/** The ready-made list item's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and its content. `lines` follows the content unless given. */
export interface ListItemProps
    extends
        Omit<ListItemRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ListItemContentProps<ReactNode>,
        ListItemExpandProps {}

/** The ready-made list item: every part in the preset's structure that has content; given a
 *  `region`, an expandable item showing it under the row. */
function ReadyMade(props: ListItemProps): ReactNode {
    const slot = useSlotProps(props);
    if (!isPresent(props.region)) return <Row props={props} slot={slot} />;
    return (
        <Expandable
            expanded={props.expanded}
            defaultExpanded={props.defaultExpanded}
            onExpandedChange={props.onExpandedChange}
            testId={props.testId}
        >
            <Row props={props} slot={slot} expandable />
            <Region {...slot("region")}>{props.region}</Region>
        </Expandable>
    );
}

/** The ready-made item's row: Root and its parts, the indicator last when expandable. */
function Row({
    props,
    slot,
    expandable = false,
}: {
    readonly props: ListItemProps;
    readonly slot: (part: PartName<Anatomy>) => PartProps;
    readonly expandable?: boolean;
}): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        headline,
        overline,
        supportingText,
        leading,
        trailing,
        trailingText,
        mirrorLeading,
        mirrorTrailing,
        region: _region,
        expanded: _expanded,
        defaultExpanded: _defaultExpanded,
        onExpandedChange: _onExpandedChange,
        ...rootProps
    } = props;
    return (
        <Root
            {...rootProps}
            lines={props.lines ?? listItemLines(props)}
            {...(slot("root") as object)}
        >
            {isPresent(leading) ? (
                <Leading mirror={mirrorLeading} {...slot("leading")}>
                    {leading}
                </Leading>
            ) : null}
            <Content {...slot("content")}>
                {isPresent(overline) ? (
                    <Overline {...slot("overline")}>{overline}</Overline>
                ) : null}
                <Headline {...slot("headline")}>{headline}</Headline>
                {isPresent(supportingText) ? (
                    <SupportingText {...slot("supportingText")}>
                        {supportingText}
                    </SupportingText>
                ) : null}
            </Content>
            {isPresent(trailing) ? (
                <Trailing mirror={mirrorTrailing} {...slot("trailing")}>
                    {trailing}
                </Trailing>
            ) : null}
            {isPresent(trailingText) ? (
                <TrailingText {...slot("trailingText")}>
                    {trailingText}
                </TrailingText>
            ) : null}
            {expandable ? <Indicator {...slot("indicator")} /> : null}
        </Root>
    );
}

/** Material's list item. Use it ready-made, `<ListItem headline="Inbox" supportingText="3 new"
 *  href="/inbox" />`, or compose its parts under `ListItem.Root`: `Leading`, `Content` holding
 *  `Overline`, `Headline`, and `SupportingText`, then `Trailing` and `TrailingText`. Put it in a
 *  `List`, or give it the element a list item needs (`as="li"`). An expandable item takes a
 *  `region` (ready-made), or composes `Expandable` around `Root` (holding an `Indicator` last) and
 *  `Region`. */
export const ListItem = Object.assign(ReadyMade, {
    Root,
    Expandable,
    Region,
    Indicator,
    Leading,
    Content,
    Overline,
    Headline,
    SupportingText,
    Trailing,
    TrailingText,
});

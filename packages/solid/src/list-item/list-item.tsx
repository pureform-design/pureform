// The list item: Root, a row that's a `<div>`, a link (`href`), or a button (`as="button"`), with
// its leading part, text (overline, headline, supporting text), and trailing parts as the preset
// draws them; and the ready-made ListItem over them. It has no machine: the app marks it selected
// or disabled. Inside a List, it takes the list's variants as its defaults. An expandable item sits
// in `Expandable`, Zag's accordion with one item: Root is its header (a button, with an
// `Indicator`), and `Region`, after Root, its content.

import { listItemAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    LIST_ITEM_CONTENT_PROPS,
    LIST_ITEM_EXPAND_PROPS,
    LIST_ITEM_EXPAND_VALUE,
    LIST_ITEM_ROOT_PROPS,
    listItemExpandMachineProps,
    listItemElement,
    listItemLines,
    listItemRootProps,
    listItemSelection,
    isInteractiveListItem,
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
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createMemo,
    createUniqueId,
    merge,
    omit,
    untrack,
    useContext,
} from "solid-js";

import { useControllable } from "../controllable";
import { ExpandIcon } from "../glyphs";
import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import {
    createSlotProps,
    iconParts,
    optionalPart,
    useComponent,
    whenPresent,
} from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { createSwipe } from "./swipe";
import type { Swipe } from "./swipe";

type Anatomy = typeof listItemAnatomy;

/** What Root shares with its parts. */
interface ListItemContextValue {
    readonly scope: ComponentScope<Anatomy>;
    /** A swipeable item's state; `undefined` for any other. */
    readonly swipe: Swipe | undefined;
}

const context = createPartContext<ListItemContextValue>("ListItem");

/** What `Expandable` shares with Root and Region. Root gives it its interaction source, which the
 *  machine's header emits to, as an accordion header's. */
interface ExpandContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<accordion.Api<PropTypes>>;
    readonly root: { source?: Accessor<MutableInteractionSource | undefined> };
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
export const ListDefaults = createContext<Accessor<ListVariantProps> | null>(
    null,
);

/** Root's props: the variants and tokens, `selected` and `disabled`, `testId` and `unstyled` for
 *  every part, `href` (a link) or `as`, and the element's own props. */
export interface ListItemRootProps
    extends Omit<PartProps, keyof ListItemRootOwnProps>, ListItemRootOwnProps {
    /** Where the item leads: Root renders a link (`<a>`). */
    readonly href?: string | undefined;
    /** Another element or component to render instead of `<div>`: `"button"` for an item that
     *  acts. */
    readonly as?: ValidComponent | undefined;
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
function Root(props: ListItemRootProps): JSX.Element {
    const list = useContext(ListDefaults);
    const expand = useContext(expandContext.Provider);
    // An expandable item's header is a button, unless told otherwise.
    const element = createMemo(() =>
        listItemElement<ValidComponent>({
            href: props.href,
            as: props.as ?? (expand ? "button" : undefined),
        }),
    );
    // An expandable item's header: the accordion machine's, emitting to Root's source.
    const own = () =>
        expand
            ? combinePartProps([
                  listItemRootProps(props, element()),
                  expand
                      .api()
                      .getItemTriggerProps(
                          expandItem(props.disabled),
                      ) as Record<string, unknown>,
              ])
            : listItemRootProps(props, element());
    // A memo: the handlers, the classes, and the indication each read it.
    const interactive = createMemo(() =>
        isInteractiveListItem(listItemVariants(list?.(), props), element()),
    );
    const source = useOwnInteractionSource(() => props.interactionSource);
    if (expand) expand.root.source = source;
    const handlers = expand
        ? undefined
        : useInteractionHandlers(
              source,
              () => !interactive() || !!props.disabled,
          );
    // Whether the row swipes is read once, when it is made: only then does it build its state. An
    // expandable item's header is a button, so it doesn't swipe (its action would be a button in a
    // button).
    const swipe = untrack(() =>
        !expand && listItemVariants(list?.(), props).swipeable
            ? createSwipe(props)
            : undefined,
    );
    const scope = useComponent(listItemAnatomy, {
        selection: () => {
            const variants = expand
                ? { ...listItemVariants(list?.(), props), swipeable: false }
                : listItemVariants(list?.(), props);
            return listItemSelection(
                swipe
                    ? {
                          ...variants,
                          tokens: { ...variants.tokens, ...swipe.tokens() },
                      }
                    : variants,
                element(),
            );
        },
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
        interactionSource: source,
        interactive,
    });
    return (
        <context.Provider value={{ scope, swipe }}>
            {scope.render("root", {
                element: "div",
                as: () => (element() === "div" ? undefined : element()),
                machine: () =>
                    swipe
                        ? combinePartProps([
                              own(),
                              interactive() && handlers
                                  ? handlers()
                                  : undefined,
                              swipe.rootProps(interactive()),
                          ])
                        : interactive() && handlers
                          ? combinePartProps([own(), handlers()])
                          : own(),
                ...(swipe
                    ? { states: () => ({ pressed: swipe.dragging() }) }
                    : {}),
                props: omit(props, "as", ...LIST_ITEM_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

const iconPart = (part: "leading" | "trailing", name: string) =>
    iconParts<Anatomy, ListItemIconProps>(
        (use) => ({
            scope: context.use(use).scope,
            machine: () => ({ "aria-hidden": "true" }),
        }),
        name,
        part,
        { mirror: true },
    );
const leading = iconPart("leading", "Leading");
const trailing = iconPart("trailing", "Trailing");

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
    function TextPart(props: ListItemPartProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element,
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

/** An icon, avatar, or image before the text, hidden from assistive technology (give it
 *  `aria-hidden={false}` when it says something). */
const Leading = leading.Part;
/** The text: the overline, headline, and supporting text. */
const Content = textPart("content", "Content", "div");
/** A line above the headline. */
const Overline = textPart("overline", "Overline", "span");
/** The item's main text. */
const Headline = textPart("headline", "Headline", "span");
/** Text under the headline. */
const SupportingText = textPart("supportingText", "SupportingText", "span");
/** An icon after the text, hidden from assistive technology. */
const Trailing = trailing.Part;
/** Text after the text, such as a count. */
const TrailingText = textPart("trailingText", "TrailingText", "span");
/** The action a swipeable row uncovers as it slides: put a button in it. It is out of reach of
 *  assistive technology and the keyboard until it's revealed. */
function Action(props: ListItemPartProps): JSX.Element {
    const { scope, swipe } = context.use("Action");
    return scope.render("action", {
        element: "div",
        machine: () => ({ inert: swipe ? !swipe.revealed() : true }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}
// The ready-made's parts for content that can come and go: the leading and trailing parts build
// theirs once.
const OptionalLeading = leading.Optional;
const OptionalTrailing = trailing.Optional;
const OptionalOverline = whenPresent(Overline);
const OptionalSupportingText = whenPresent(SupportingText);
const OptionalTrailingText = whenPresent(TrailingText);
const OptionalAction = whenPresent(Action);

/** An expandable item's indicator, after the text: a chevron (or its children) that turns over
 *  while the item is expanded, hidden from assistive technology. */
function Indicator(props: ListItemPartProps): JSX.Element {
    const { scope } = context.use("Indicator");
    return scope.render("indicator", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return props.children ?? <ExpandIcon />;
            },
        }),
    });
}

/** `Expandable`'s props: whether the item is expanded (controllable), the region's and the
 *  indicator's test ids, and Root and Region as children. */
export interface ListItemExpandableProps extends ListItemExpandProps {
    /** A prefix for its parts' test ids, or ids by part (Region's). */
    readonly testId?: TestIdOverride<ListItemPart> | undefined;
    readonly children?: JSX.Element;
}

/** An expandable item: Zag's accordion with one item, around the item's Root (its header) and
 *  its Region. */
function Expandable(props: ListItemExpandableProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const list = useContext(ListDefaults);
    const root: ExpandContextValue["root"] = {};
    const controllable = useControllable<"expanded", boolean>(
        "ListItem",
        "expanded",
        props,
    );
    const service = useMachine(accordion.machine, () => ({
        id,
        dir: dir(),
        itemInteractionSource: () =>
            untrack(() => root.source?.()) as MutableInteractionSource,
        ...listItemExpandMachineProps(controllable.machineProps()),
    }));
    const api = createMemo(() => accordion.connect(service, normalizeProps));
    const scope = useComponent(listItemAnatomy, {
        selection: () =>
            listItemSelection(listItemVariants(list?.(), {}), "button"),
        testId: () => props.testId,
    });
    return (
        <expandContext.Provider value={{ scope, api, root }}>
            {props.children}
        </expandContext.Provider>
    );
}

/** What an expandable item shows while expanded, after its Root: nested list items, say. Hidden
 *  while collapsed, named by Root. */
function Region(props: ListItemPartProps): JSX.Element {
    const expand = expandContext.use("Region");
    return expand.scope.render("region", {
        element: "div",
        machine: () => expand.api().getItemContentProps(expandItem(undefined)),
        unstyled: () => props.unstyled,
        // The items inside are its content, not more headers.
        props: merge(omit(props, "unstyled", "children"), {
            get children() {
                return (
                    <expandContext.Provider value={null}>
                        {props.children}
                    </expandContext.Provider>
                );
            },
        }),
    });
}

/** The ready-made list item's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and its content. `lines` follows the content unless given. */
export interface ListItemProps
    extends
        Omit<ListItemRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ListItemContentProps<JSX.Element>,
        ListItemExpandProps {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...LIST_ITEM_CONTENT_PROPS,
    ...LIST_ITEM_EXPAND_PROPS,
] as const;

/** The ready-made list item: every part in the preset's structure that has content; given a
 *  `region` when it's created, an expandable item showing it under the row. */
function ReadyMade(props: ListItemProps): JSX.Element {
    const slots = createSlotProps(props);
    if (!untrack(() => isPresent(props.region)))
        return row(props, slots, false);
    const region = slots("region");
    return (
        <Expandable
            expanded={props.expanded}
            defaultExpanded={props.defaultExpanded}
            onExpandedChange={props.onExpandedChange}
            testId={props.testId}
        >
            {row(props, slots, true)}
            <Region {...region}>{props.region}</Region>
        </Expandable>
    );
}

const NoPart: (props: ListItemPartProps) => JSX.Element = () => undefined;

/** The ready-made item's row: Root and its parts, the indicator last when expandable. */
function row(
    props: ListItemProps,
    slots: (part: PartName<Anatomy>) => PartProps,
    expandable: boolean,
): JSX.Element {
    const own = omit(props, ...READY_MADE_PROPS) as ListItemRootProps;
    const root = slots("root") as object;
    const leading = slots("leading");
    const content = slots("content");
    const overline = slots("overline");
    const headline = slots("headline");
    const supportingText = slots("supportingText");
    const trailing = slots("trailing");
    const trailingText = slots("trailingText");
    // Picked here, so a row that can't expand makes no node for it, and an expandable row (a
    // button) no swipe action.
    const IndicatorPart = expandable ? Indicator : NoPart;
    const indicator = expandable ? slots("indicator") : {};
    const action = expandable ? {} : slots("action");
    const LeadingPart = optionalPart(
        props,
        "leading",
        Leading,
        OptionalLeading,
    );
    const OverlinePart = optionalPart(
        props,
        "overline",
        Overline,
        OptionalOverline,
    );
    const SupportingTextPart = optionalPart(
        props,
        "supportingText",
        SupportingText,
        OptionalSupportingText,
    );
    const TrailingPart = optionalPart(
        props,
        "trailing",
        Trailing,
        OptionalTrailing,
    );
    const TrailingTextPart = optionalPart(
        props,
        "trailingText",
        TrailingText,
        OptionalTrailingText,
    );
    const ActionPart = expandable
        ? NoPart
        : optionalPart(props, "swipeAction", Action, OptionalAction);
    return (
        <Root
            {...own}
            lines={props.lines ?? listItemLines(props)}
            swipeable={
                expandable
                    ? false
                    : (props.swipeable ??
                      (isPresent(props.swipeAction) || undefined))
            }
            {...root}
        >
            <LeadingPart mirror={props.mirrorLeading} {...leading}>
                {props.leading}
            </LeadingPart>
            <Content {...content}>
                <OverlinePart {...overline}>{props.overline}</OverlinePart>
                <Headline {...headline}>{props.headline}</Headline>
                <SupportingTextPart {...supportingText}>
                    {props.supportingText}
                </SupportingTextPart>
            </Content>
            <TrailingPart mirror={props.mirrorTrailing} {...trailing}>
                {props.trailing}
            </TrailingPart>
            <TrailingTextPart {...trailingText}>
                {props.trailingText}
            </TrailingTextPart>
            <IndicatorPart {...indicator} />
            <ActionPart {...action}>{props.swipeAction}</ActionPart>
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
    Action,
});

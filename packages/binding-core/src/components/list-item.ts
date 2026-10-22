// The list item's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection, the content the ready-made list item takes, and Root's element props. A list
// item has no machine: it's a row, a link (`href`), or a button (`as="button"`), and an app marks
// it selected or disabled. An expandable item (given a `region`) is a button that shows or hides
// the region after it, its expand indicator turning over: the accordion's header and content, for
// one item.

import type {
    listItemAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import { isPresent } from "./content";
import type { InteractiveProps } from "./indication";
import type { ListItemSwipeProps } from "./list-item-swipe";
import { LIST_ITEM_SWIPE_PROPS } from "./list-item-swipe";
import type { VariantProp } from "./variants";

/** The list item's parts: `"root" | "leading" | "content" | "overline" | "headline" |
 *  "supportingText" | "trailing" | "trailingText" | "indicator"` (an expandable item's) `|
 *  "region"` (what it expands, after the row). */
export type ListItemPart = PartName<typeof listItemAnatomy>;

/** The list item's variant groups and instance tokens. `interactive` gives it the state layer and
 *  the focus ring of something clickable. */
export interface ListItemVariantProps {
    readonly lines?: VariantProp<"listItem", "lines">;
    readonly interactive?: boolean | undefined;
    /** What the leading part holds: an icon, an avatar (40), a thumbnail (56), or a video's
     *  frame (114 by 64). @default "icon" */
    readonly leadingType?: VariantProp<"listItem", "leadingType">;
    /** Its place among a segmented list's tiles, which rounds its corners. A segmented `List`
     *  sets it. @default "none" */
    readonly position?: VariantProp<"listItem", "position">;
    /** The row slides to uncover an action (`swipeAction` on the ready-made item). Set by the
     *  ready-made item when it has one. @default false */
    readonly swipeable?: boolean | undefined;
    /** The swipe action's colours: the secondary container, or the error container for a
     *  destructive action. @default "secondary" */
    readonly actionColor?: VariantProp<"listItem", "actionColor">;
    readonly density?: VariantProp<"listItem", "density">;
    readonly color?: VariantProp<"listItem", "color">;
    readonly tokens?: InstanceTokens<"listItem"> | undefined;
}

/** What a list item takes about its state. */
export interface ListItemStateProps {
    /** Marks it the current item, with `aria-current` (`"page"` on a link). */
    readonly selected?: boolean | undefined;
    /** Dims it; a button is disabled, anything else `aria-disabled`. */
    readonly disabled?: boolean | undefined;
}

/** Whether an expandable item shows its region. Only an item in an `Expandable` (or a
 *  ready-made one given a `region`) takes them. */
export type ListItemExpandProps = Controllable<"expanded", boolean>;

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ListItemRootOwnProps
    extends
        ListItemVariantProps,
        ListItemStateProps,
        ListItemSwipeProps,
        InteractiveProps {
    /** A prefix for every part's test id (`inbox` → `inbox-headline`), or ids by part. */
    readonly testId?: TestIdOverride<ListItemPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ListItemPart> | undefined;
}

/** The keys of `ListItemRootOwnProps`, which Root keeps off its element. */
export const LIST_ITEM_ROOT_PROPS = [
    "lines",
    "interactive",
    "leadingType",
    "position",
    "swipeable",
    "actionColor",
    "density",
    "color",
    "tokens",
    ...LIST_ITEM_SWIPE_PROPS,
    "selected",
    "disabled",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof ListItemRootOwnProps)[];

/** What the ready-made list item renders inside Root, in the framework's node type. Each part
 *  renders only when given, but the headline. */
export interface ListItemContentProps<Node> {
    readonly headline?: Node;
    /** A line above the headline. */
    readonly overline?: Node;
    readonly supportingText?: Node;
    /** An icon, avatar, or image before the text. */
    readonly leading?: Node;
    /** An icon or control after the text. */
    readonly trailing?: Node;
    /** Text after the text, such as a count. */
    readonly trailingText?: Node;
    /** The action the row slides to uncover: a button. Makes the item swipeable. Don't put it in
     *  a link or button item; the action is a button of its own. An item with a `region` (a
     *  button) ignores it. */
    readonly swipeAction?: Node;
    /** Flip the leading or trailing icon under `rtl`, for an icon that points. */
    readonly mirrorLeading?: boolean | undefined;
    readonly mirrorTrailing?: boolean | undefined;
    /** What the item expands to show, under it (nested list items): the item becomes a button
     *  with an expand indicator. */
    readonly region?: Node;
}

/** The keys of `ListItemContentProps`. */
export const LIST_ITEM_CONTENT_PROPS = [
    "headline",
    "overline",
    "supportingText",
    "leading",
    "trailing",
    "trailingText",
    "swipeAction",
    "mirrorLeading",
    "mirrorTrailing",
    "region",
] as const satisfies readonly (keyof ListItemContentProps<unknown>)[];

/** The element Root renders: a link with an `href`, else `as`, else a `<div>`. */
export const listItemElement = <E>(props: {
    readonly href?: string | undefined;
    readonly as?: E | undefined;
}): E | "a" | "div" => (props.href !== undefined ? "a" : (props.as ?? "div"));

/** Whether an element is clickable as it is: a link or a button. */
const isInteractiveElement = (element: unknown) =>
    element === "a" || element === "button";

/** Whether the list item is interactive: `interactive`, else whether Root renders a link or a
 *  button. Only then does it show indication. */
export const isInteractiveListItem = (
    props: Pick<ListItemVariantProps, "interactive">,
    element: unknown,
): boolean => props.interactive ?? isInteractiveElement(element);

/** The registry selection from Root's props: `interactive` defaults to whether Root renders a
 *  link or a button. */
export const listItemSelection = (
    props: ListItemVariantProps,
    element: unknown,
): Selection<"listItem"> => ({
    lines: props.lines,
    interactive: isInteractiveListItem(props, element),
    leadingType: props.leadingType,
    position: props.position,
    swipeable: props.swipeable,
    actionColor: props.actionColor,
    density: props.density,
    color: props.color,
    tokens: props.tokens,
});

/** Root's element props from its state: `aria-current` while selected, and the disabled state as
 *  a button's `disabled` or `aria-disabled`; a button also gets `type="button"`. */
export const listItemRootProps = (
    props: ListItemStateProps,
    element: unknown,
) => {
    const button = element === "button";
    return {
        type: button ? ("button" as const) : undefined,
        "aria-current": props.selected
            ? element === "a"
                ? ("page" as const)
                : ("true" as const)
            : undefined,
        disabled: button && props.disabled ? true : undefined,
        "aria-disabled":
            !button && props.disabled ? ("true" as const) : undefined,
    };
};

/** The ready-made list item's `lines`, when not given: one line of text, two with an overline or
 *  supporting text, three with both. */
export const listItemLines = (
    content: Pick<ListItemContentProps<unknown>, "overline" | "supportingText">,
): "one" | "two" | "three" => {
    const extra =
        Number(isPresent(content.overline)) +
        Number(isPresent(content.supportingText));
    return extra === 0 ? "one" : extra === 1 ? "two" : "three";
};

/** The keys of `ListItemExpandProps`. */
export const LIST_ITEM_EXPAND_PROPS = [
    "expanded",
    "defaultExpanded",
    "onExpandedChange",
] as const satisfies readonly (keyof ListItemExpandProps)[];

/** The value of an expandable item's single accordion item, on the web bindings. */
export const LIST_ITEM_EXPAND_VALUE = "item";

/** Zag's accordion props for an expandable item, one item that opens and closes, from the item's
 *  `expanded`, `defaultExpanded` and `onExpandedChange`. */
export const listItemExpandMachineProps = (props: ListItemExpandProps) => ({
    collapsible: true,
    multiple: false,
    value:
        props.expanded === undefined
            ? undefined
            : props.expanded
              ? [LIST_ITEM_EXPAND_VALUE]
              : [],
    defaultValue: props.defaultExpanded ? [LIST_ITEM_EXPAND_VALUE] : [],
    onValueChange: (details: { value: string[] }) =>
        props.onExpandedChange?.({
            expanded: details.value.includes(LIST_ITEM_EXPAND_VALUE),
        }),
});

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
 *  "region"` (what it expands, after the row) `| "frame" | "action"` (a swipeable item's: the
 *  frame around the row and its action). */
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
    /** The row slides to uncover an action. Set by the frame around a swipeable row (on the
     *  web) or by `swipeAction`. @default false */
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

/** Everything Root takes for itself, besides the element's own props and `as`. Whether it
 *  swipes, and the action's colours, are the frame's (`ListItemFrameOwnProps`). */
export interface ListItemRootOwnProps
    extends
        Omit<ListItemVariantProps, "swipeable" | "actionColor">,
        ListItemStateProps,
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
    "density",
    "color",
    "tokens",
    "selected",
    "disabled",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof ListItemRootOwnProps)[];

/** What a swipeable item's frame takes: whether its action is revealed and how wide it is, and
 *  the action's colours. The row in it swipes. */
export interface ListItemFrameOwnProps extends ListItemSwipeProps {
    /** The action's colours: the secondary container, or the error container for a destructive
     *  action. @default "secondary" */
    readonly actionColor?: VariantProp<"listItem", "actionColor">;
}

/** The keys of `ListItemFrameOwnProps`. */
export const LIST_ITEM_FRAME_PROPS = [
    ...LIST_ITEM_SWIPE_PROPS,
    "actionColor",
] as const satisfies readonly (keyof ListItemFrameOwnProps)[];

/** What the ready-made list item renders inside Root, in the framework's node type. Each part
 *  renders only when given, but the headline. */
export interface ListItemContentProps<Node> {
    readonly headline?: Node;
    /** A line above the headline. */
    readonly overline?: Node;
    readonly supportingText?: Node;
    /** An icon, avatar, or image before the text. */
    readonly leading?: Node;
    /** An icon or control after the text. An icon is hidden from assistive technology; say
     *  `trailingControl` for a control (a button, a switch). */
    readonly trailing?: Node;
    /** `trailing` is a control (a button, a switch), which assistive technology reaches, rather
     *  than an icon it skips. */
    readonly trailingControl?: boolean | undefined;
    /** Text after the text, such as a count. */
    readonly trailingText?: Node;
    /** The action the row slides to uncover: a button. Makes the item swipeable: the action sits
     *  beside the row, in a frame, so a link, a button, or an expandable item swipes too. */
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
    "trailingControl",
    "trailingText",
    "swipeAction",
    "mirrorLeading",
    "mirrorTrailing",
    "region",
] as const satisfies readonly (keyof ListItemContentProps<unknown>)[];

/** Own interaction semantics over the binding's inferred behavior. */
export const isInteractiveListItem = (
    props: Pick<ListItemVariantProps, "interactive">,
    interactive: boolean,
): boolean => props.interactive ?? interactive;

/** The registry selection from Root's props and explicit interaction semantics. */
export const listItemSelection = (
    props: ListItemVariantProps,
    interactive: boolean,
): Selection<"listItem"> => ({
    lines: props.lines,
    interactive: isInteractiveListItem(props, interactive),
    leadingType: props.leadingType,
    position: props.position,
    swipeable: props.swipeable,
    actionColor: props.actionColor,
    density: props.density,
    color: props.color,
    tokens: props.tokens,
});

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

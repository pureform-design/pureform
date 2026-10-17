// The list item's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection, the content the ready-made list item takes, and Root's element props. A list
// item has no machine: it's a row, a link (`href`), or a button (`as="button"`), and an app marks
// it selected or disabled.

import type {
    listItemAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import { isPresent } from "./content";
import type { VariantProp } from "./variants";

/** The list item's parts: `"root" | "leading" | "content" | "overline" | "headline" |
 *  "supportingText" | "trailing" | "trailingText"`. */
export type ListItemPart = PartName<typeof listItemAnatomy>;

/** The list item's variant groups and instance tokens. `interactive` gives it the state layer and
 *  the focus ring of something clickable. */
export interface ListItemVariantProps {
    readonly lines?: VariantProp<"listItem", "lines">;
    readonly interactive?: boolean | undefined;
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

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ListItemRootOwnProps
    extends ListItemVariantProps, ListItemStateProps {
    /** A prefix for every part's test id (`inbox` → `inbox-headline`), or ids by part. */
    readonly testId?: TestIdOverride<ListItemPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ListItemPart> | undefined;
}

/** The keys of `ListItemRootOwnProps`, which Root keeps off its element. */
export const LIST_ITEM_ROOT_PROPS = [
    "lines",
    "interactive",
    "density",
    "color",
    "tokens",
    "selected",
    "disabled",
    "testId",
    "unstyled",
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
    /** Flip the leading or trailing icon under `rtl`, for an icon that points. */
    readonly mirrorLeading?: boolean | undefined;
    readonly mirrorTrailing?: boolean | undefined;
}

/** The keys of `ListItemContentProps`. */
export const LIST_ITEM_CONTENT_PROPS = [
    "headline",
    "overline",
    "supportingText",
    "leading",
    "trailing",
    "trailingText",
    "mirrorLeading",
    "mirrorTrailing",
] as const satisfies readonly (keyof ListItemContentProps<unknown>)[];

/** The element Root renders: a link with an `href`, else `as`, else a `<div>`. */
export const listItemElement = <E>(props: {
    readonly href?: string | undefined;
    readonly as?: E | undefined;
}): E | "a" | "div" => (props.href !== undefined ? "a" : (props.as ?? "div"));

/** Whether an element is clickable as it is: a link or a button. */
const isInteractiveElement = (element: unknown) =>
    element === "a" || element === "button";

/** The registry selection from Root's props: `interactive` defaults to whether Root renders a
 *  link or a button. */
export const listItemSelection = (
    props: ListItemVariantProps,
    element: unknown,
): Selection<"listItem"> => ({
    lines: props.lines,
    interactive: props.interactive ?? isInteractiveElement(element),
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

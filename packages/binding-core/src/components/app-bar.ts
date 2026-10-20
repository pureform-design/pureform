// The app bar's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection, the content the ready-made app bar takes, and its scroll behavior. The app
// bar has no machine: it follows the offset of the page scrolling under it, lifting into the
// scrolled container color once the page moves, and drawing a flexible bar as the small one once
// the page has scrolled past its headline.

import type {
    appBarAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The app bar's parts: `"root" | "leading" | "content" | "headline" | "subtitle" |
 *  "trailing"`. */
export type AppBarPart = PartName<typeof appBarAnatomy>;

/** The app bar's sizes. */
export type AppBarSize = "small" | "mediumFlexible" | "largeFlexible";

/** What the app bar does as the page scrolls under it. `pinned` stays put and lifts into the
 *  scrolled color; `collapse` also draws a flexible bar as the small one once the page has
 *  scrolled past its headline, and expands it again on the way back. */
export type AppBarScrollBehavior = "pinned" | "collapse";

/** The app bar's variants and instance tokens. */
export interface AppBarVariantProps {
    /** `small` (the default), or M3 Expressive's `mediumFlexible` and `largeFlexible`, which put
     *  the headline on a line of its own under the actions, larger. */
    readonly size?: VariantProp<"appBar", "size">;
    /** Centers the headline and subtitle. */
    readonly centered?: VariantProp<"appBar", "centered">;
    readonly tokens?: InstanceTokens<"appBar"> | undefined;
}

/** How the app bar follows the page scrolling under it. */
export interface AppBarScrollProps {
    /** @default "collapse" */
    readonly scrollBehavior?: AppBarScrollBehavior | undefined;
    /** How far the page under the bar has scrolled, in px. Give it to drive the bar yourself (on
     *  React Native, from a scroll view's `onScroll`). */
    readonly scrollOffset?: number | undefined;
    /** Draw the bar scrolled, or not, whatever the offset says. */
    readonly scrolled?: boolean | undefined;
    /** Draw a flexible bar collapsed, or not, whatever the offset says. */
    readonly collapsed?: boolean | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface AppBarRootOwnProps
    extends AppBarVariantProps, AppBarScrollProps {
    /** The bar holds a search bar in place of the headline. The ready-made app bar sets it when
     *  given `search`. */
    readonly search?: boolean | undefined;
    /** A prefix for every part's test id (`inbox` → `inbox-headline`), or ids by part. */
    readonly testId?: TestIdOverride<AppBarPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<AppBarPart> | undefined;
}

/** The keys of `AppBarRootOwnProps`, which Root keeps off its element. */
export const APP_BAR_ROOT_PROPS = [
    "size",
    "centered",
    "tokens",
    "scrollBehavior",
    "scrollOffset",
    "scrolled",
    "collapsed",
    "search",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof AppBarRootOwnProps)[];

/** What the ready-made app bar renders inside Root, in the framework's node type. The search
 *  bar's props type is the binding's. */
export interface AppBarContentProps<Node, Search = never> {
    /** The navigation button before the headline, such as a back or menu icon button. */
    readonly leading?: Node;
    /** The screen's title. */
    readonly headline?: Node;
    /** A line under the headline. */
    readonly subtitle?: Node;
    /** Actions after the headline: icon buttons, an avatar, or an overflow menu. */
    readonly trailing?: Node;
    /** A search bar in place of the headline, with these props; it takes the bar's scrolled
     *  color and centers its text. */
    readonly searchBar?: Search | undefined;
    /** Flip the leading part under `rtl`, for a back arrow. */
    readonly mirrorLeading?: boolean | undefined;
}

/** The keys of `AppBarContentProps`. */
export const APP_BAR_CONTENT_PROPS = [
    "leading",
    "headline",
    "subtitle",
    "trailing",
    "searchBar",
    "mirrorLeading",
] as const satisfies readonly (keyof AppBarContentProps<unknown, unknown>)[];

/** Whether the size puts the headline on a line of its own. */
export const isFlexibleAppBar = (size: unknown): size is AppBarSize =>
    size === "mediumFlexible" || size === "largeFlexible";

/** How far the page scrolls before a flexible bar collapses, by size: the room its headline
 *  line takes (the preset's `mediumContentHeight` and `largeContentHeight`). */
export const APP_BAR_COLLAPSE_OFFSET: Readonly<Record<AppBarSize, number>> = {
    small: 0,
    mediumFlexible: 48,
    largeFlexible: 56,
};

/** The app bar's scroll state. */
export interface AppBarScrollState {
    /** The page has scrolled under the bar. */
    readonly scrolled: boolean;
    /** A flexible bar draws as the small one. */
    readonly collapsed: boolean;
}

/** The unscrolled state. */
export const APP_BAR_AT_REST: AppBarScrollState = {
    scrolled: false,
    collapsed: false,
};

/** The scroll state at `offset`, from the previous one. A collapsed bar expands only once the
 *  page is back within half its collapse offset, so the bar's own change of height, which moves
 *  the page under it, can't toggle it back and forth. */
export const appBarScrollState = (
    offset: number,
    {
        size,
        behavior = "collapse",
        previous = APP_BAR_AT_REST,
    }: {
        readonly size?: unknown;
        readonly behavior?: AppBarScrollBehavior | undefined;
        readonly previous?: AppBarScrollState | undefined;
    } = {},
): AppBarScrollState => {
    const scrolled = offset > 0;
    if (behavior !== "collapse" || !isFlexibleAppBar(size))
        return scrolled === previous.scrolled && !previous.collapsed
            ? previous
            : { scrolled, collapsed: false };
    const threshold = APP_BAR_COLLAPSE_OFFSET[size];
    const collapsed = previous.collapsed
        ? offset > threshold / 2
        : offset >= threshold;
    return scrolled === previous.scrolled && collapsed === previous.collapsed
        ? previous
        : { scrolled, collapsed };
};

/** The state Root draws: the owner's `scrolled` and `collapsed` win over the offset's. A small
 *  bar never collapses. */
export const appBarDrawnState = (
    props: AppBarRootOwnProps,
    fromOffset: AppBarScrollState,
): AppBarScrollState => ({
    scrolled: props.scrolled ?? fromOffset.scrolled,
    collapsed:
        isFlexibleAppBar(props.size) &&
        (props.collapsed ?? fromOffset.collapsed),
});

/** Whether the content renders after the trailing part, on a line of its own: an expanded
 *  flexible bar's headline. A search bar always sits between the leading and trailing parts. */
export const appBarContentLast = (
    props: Pick<AppBarRootOwnProps, "size" | "search">,
    state: AppBarScrollState,
): boolean => isFlexibleAppBar(props.size) && !props.search && !state.collapsed;

/** The registry selection from Root's props and its drawn scroll state. A search bar keeps the
 *  small bar's layout. */
export const appBarSelection = (
    props: AppBarRootOwnProps,
    state: AppBarScrollState,
): Selection<"appBar"> => ({
    size: props.search ? "small" : props.size,
    centered: props.centered,
    search: props.search,
    scrolled: state.scrolled,
    collapsed: state.collapsed && !props.search,
    tokens: props.tokens,
});

// The horizontal shared axis's contract, shared by every binding: the props Root takes for
// itself, the pages it keeps while a change runs, and which way each change goes. A change to a
// later page (a higher `index`) goes forward; to an earlier one, backward. The binding keeps the
// outgoing page until its animations end, inert and hidden from assistive technology.

import type {
    horizontalSharedAxisAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";

/** The shared axis's parts: `"root"`, `"page"`, `"scrim"`. */
export type HorizontalSharedAxisPart = PartName<
    typeof horizontalSharedAxisAnatomy
>;

/** Which way a change goes: to a later page, or an earlier one. */
export type SharedAxisDirection = "forward" | "backward";

/** Where a page is: shown and still, coming in, or going out. */
export type SharedAxisPageState = "current" | "entering" | "leaving";

/** The shared axis's instance tokens; it has no variant groups. */
export interface HorizontalSharedAxisVariantProps {
    readonly tokens?: InstanceTokens<"horizontalSharedAxis"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface HorizontalSharedAxisRootOwnProps extends HorizontalSharedAxisVariantProps {
    /** The page's place in the order: a change to a higher index slides forward, to a lower one
     *  backward. A change of `index` is a change of page. */
    readonly index: number;
    /** Veil the page underneath while a change runs, in the theme's scrim color (Compose's
     *  `MaterialTransitions.scrimColor`). @default false */
    readonly scrim?: boolean | undefined;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<HorizontalSharedAxisPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<HorizontalSharedAxisPart> | undefined;
}

/** The keys of `HorizontalSharedAxisRootOwnProps`, which Root keeps off its element. */
export const HORIZONTAL_SHARED_AXIS_ROOT_PROPS = [
    "index",
    "scrim",
    "tokens",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof HorizontalSharedAxisRootOwnProps)[];

/** The registry selection from Root's props. */
export const horizontalSharedAxisSelection = (
    props: HorizontalSharedAxisVariantProps,
): Selection<"horizontalSharedAxis"> => ({ tokens: props.tokens });

/** How a component with pages (the ready-made tabs, a horizontal stepper) moves between them. */
export interface PageTransitionProps {
    /** `"sharedAxis"` slides and fades the pages along the x axis, in their order (Material's
     *  horizontal shared axis); `"none"` swaps them at once. @default "none" */
    readonly transition?: "none" | "sharedAxis" | undefined;
    /** With `"sharedAxis"`, veil the page underneath while it moves. @default false */
    readonly transitionScrim?: boolean | undefined;
}

/** The keys of `PageTransitionProps`. */
export const PAGE_TRANSITION_PROPS = [
    "transition",
    "transitionScrim",
] as const satisfies readonly (keyof PageTransitionProps)[];

/** Which way a change from page `from` to page `to` goes. */
export const sharedAxisDirection = (
    from: number,
    to: number,
): SharedAxisDirection => (to < from ? "backward" : "forward");

/** A page the shared axis shows: its index (its key), where it is, and which way it moves. */
export interface SharedAxisPage {
    readonly index: number;
    readonly state: SharedAxisPageState;
    readonly direction: SharedAxisDirection | undefined;
}

/** The first page, shown without motion. */
export const sharedAxisStart = (index: number): readonly SharedAxisPage[] => [
    { index, state: "current", direction: undefined },
];

/** The pages after a change to `index`: the page shown before leaves the way the change goes and
 *  the new one enters. A page still leaving from an earlier change is dropped, so at most two
 *  show. The same index changes nothing. */
export const sharedAxisChange = (
    pages: readonly SharedAxisPage[],
    index: number,
): readonly SharedAxisPage[] => {
    const shown = pages.find((page) => page.state !== "leaving");
    if (!shown) return sharedAxisStart(index);
    if (shown.index === index) {
        return pages;
    }
    const direction = sharedAxisDirection(shown.index, index);
    return [
        { index: shown.index, state: "leaving", direction },
        { index, state: "entering", direction },
    ];
};

/** The pages once page `index`'s animations have ended: a leaving page goes, an entering one
 *  becomes current. A page that has since changed state is left as it is. */
export const sharedAxisSettle = (
    pages: readonly SharedAxisPage[],
    index: number,
    state: SharedAxisPageState,
): readonly SharedAxisPage[] => {
    const page = pages.find((p) => p.index === index && p.state === state);
    if (!page) return pages;
    if (state === "leaving") return pages.filter((p) => p !== page);
    if (state === "entering") {
        return pages.map((p) =>
            p === page ? { index, state: "current", direction: undefined } : p,
        );
    }
    return pages;
};

/** Whether a change is running: a page is still entering or leaving. */
export const sharedAxisMoving = (pages: readonly SharedAxisPage[]): boolean =>
    pages.some((page) => page.state !== "current");

/** A page's attributes: its state and direction for the styles, and a leaving page inert and
 *  hidden from assistive technology. */
export const sharedAxisPageProps = (
    page: SharedAxisPage,
): Record<string, string | boolean | undefined> => ({
    "data-state": page.state,
    "data-direction": page.direction,
    ...(page.state === "leaving" ? { inert: true, "aria-hidden": "true" } : {}),
});

/** The scrim's attributes while a change runs: its direction, hidden from assistive technology. */
export const sharedAxisScrimProps = (
    direction: SharedAxisDirection,
): Record<string, string> => ({
    "data-direction": direction,
    "aria-hidden": "true",
});

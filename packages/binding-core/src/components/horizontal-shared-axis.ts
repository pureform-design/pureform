// The horizontal shared axis's contract, shared by every binding: the props Root takes for
// itself, which way each change goes, and the attributes of its pages and scrim. A change to a
// later page (a higher `index`) goes forward; to an earlier one, backward. The pages are
// `page-transition.ts`'s, keyed by index, at most two at a time.

import type {
    horizontalSharedAxisAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import { changePages } from "./page-transition";
import type { PageDirection, TransitionPage } from "./page-transition";

/** The shared axis's parts: `"root"`, `"page"`, `"scrim"`. */
export type HorizontalSharedAxisPart = PartName<
    typeof horizontalSharedAxisAnatomy
>;

/** Which way a change goes: to a later page, or an earlier one. */
export type SharedAxisDirection = PageDirection;

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
     *  `MaterialTransitions.scrimColor`). Off by default: Compose draws it only behind
     *  predictive back, which pureform leaves out. @default false */
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

/** How far a page slides, as a share of its width (Compose's `SlideFraction`), for a target
 *  that moves it in code (React Native); the web's keyframes say the same. */
export const SHARED_AXIS_SLIDE_FRACTION = 0.2;

/** The pages' fade in ms (Compose's `FadeAnimationSpec`: linear, 90ms after 50ms), for a target
 *  that moves them in code; the web reads the preset's `fadeDuration` and `fadeDelay`. */
export const SHARED_AXIS_FADE = { duration: 90, delay: 50 } as const;

/** Which way a change from page `from` to page `to` goes. */
export const sharedAxisDirection = (
    from: number,
    to: number,
): SharedAxisDirection => (to < from ? "backward" : "forward");

/** The pages after a change to `index`: the page shown before leaves the way the change goes and
 *  the new one enters. A page still leaving from an earlier change is dropped, so at most two
 *  show. The same index changes nothing. */
export const sharedAxisChange = (
    pages: readonly TransitionPage[],
    index: number,
): readonly TransitionPage[] => {
    const shown = pages.find((page) => page.state !== "leaving");
    return changePages(pages, index, {
        direction: shown && sharedAxisDirection(Number(shown.key), index),
    });
};

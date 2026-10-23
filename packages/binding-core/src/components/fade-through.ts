// The fade through's contract, shared by every binding: the props Root takes for itself, and the
// attributes of its pages. The app wraps content that changes in it with a `value` naming what it
// shows (a navigation destination); when `value` changes, the page showing it leaves (`"closed"`)
// and the new one enters (`"open"`). The pages are `page-transition.ts`'s, kept through quick
// switches (`keepLeaving`) until each exit ends.

import type {
    fadeThroughAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import { LEAVING_PAGE_PROPS } from "./page-transition";
import type { PageKey, TransitionPage } from "./page-transition";

/** The fade through's parts: `"root"` and `"page"`. */
export type FadeThroughPart = PartName<typeof fadeThroughAnatomy>;

/** What names the content shown: a navigation destination's value. */
export type FadeThroughValue = PageKey;

/** Everything Root takes for itself, besides the element's own props, `as` and the content. */
export interface FadeThroughRootOwnProps {
    /** What the content shows, such as the selected navigation destination's value; a new value
     *  fades through to the content given with it. */
    readonly value: FadeThroughValue;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<FadeThroughPart> | undefined;
    /** Without the registry's styles. */
    readonly unstyled?: Unstyled<FadeThroughPart> | undefined;
}

/** The keys of `FadeThroughRootOwnProps`, which Root keeps off its element. */
export const FADE_THROUGH_ROOT_PROPS = [
    "value",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof FadeThroughRootOwnProps)[];

/** The registry selection: the fade through has no variants or tokens. */
export const fadeThroughSelection = (): Selection<"fadeThrough"> => ({});

/** A page's attributes: entering `data-state="open"`, leaving `"closed"` (and out of reach,
 *  hidden from assistive technology); the page shown first has none, so it doesn't animate. A
 *  fade through doesn't settle its entering pages, so an entered page keeps `"open"`. */
export const fadeThroughPageProps = (
    page: TransitionPage,
): Readonly<Record<string, string | boolean>> =>
    page.state === "leaving"
        ? { "data-state": "closed", ...LEAVING_PAGE_PROPS }
        : page.state === "entering"
          ? { "data-state": "open" }
          : {};

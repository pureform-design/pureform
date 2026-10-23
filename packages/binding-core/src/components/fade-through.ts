// The fade through's contract, shared by every binding: the props Root takes for itself, and the
// pages it shows. The app wraps content that changes in it with a `value` naming what it shows
// (a navigation destination); when `value` changes, the page showing it leaves (`"closed"`) and
// the new one enters (`"open"`). The page shown first has no state, so it doesn't animate. A page
// that has left goes once its exit has ended (`dropPage`).

import type {
    fadeThroughAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";

/** The fade through's parts: `"root"` and `"page"`. */
export type FadeThroughPart = PartName<typeof fadeThroughAnatomy>;

/** What names the content shown: a navigation destination's value. */
export type FadeThroughValue = string | number;

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

/** A page's state: entering (`"open"`), leaving (`"closed"`), or the first shown (none). */
export type FadeThroughState = "open" | "closed" | undefined;

/** One page: the value it shows, its content, and its state. */
export interface FadeThroughPage<C> {
    readonly value: FadeThroughValue;
    readonly content: C;
    readonly state: FadeThroughState;
}

/** The pages after `value` is shown with `content`: the same value keeps its page with the new
 *  content; a new one sends the shown page out and brings a page in. A page still leaving with
 *  that value gives way to the new one. */
export const showPage = <C>(
    pages: readonly FadeThroughPage<C>[],
    value: FadeThroughValue,
    content: C,
): readonly FadeThroughPage<C>[] => {
    const shown = pages.find((page) => page.state !== "closed");
    if (shown === undefined) return [{ value, content, state: undefined }];
    if (shown.value === value) {
        return shown.content === content
            ? pages
            : pages.map((page) =>
                  page === shown ? { ...page, content } : page,
              );
    }
    return [
        ...pages
            .filter((page) => page.value !== value)
            .map((page) =>
                page === shown ? { ...page, state: "closed" as const } : page,
            ),
        { value, content, state: "open" },
    ];
};

/** The pages without the page that left showing `value`, once its exit has ended. */
export const dropPage = <C>(
    pages: readonly FadeThroughPage<C>[],
    value: FadeThroughValue,
): readonly FadeThroughPage<C>[] =>
    pages.some((page) => page.value === value && page.state === "closed")
        ? pages.filter(
              (page) => !(page.value === value && page.state === "closed"),
          )
        : pages;

/** The props a page's element takes for its state: `data-state`, and, leaving, hidden from
 *  assistive technology and out of reach. */
export const pageStateProps = (
    state: FadeThroughState,
): Readonly<Record<string, string | boolean>> =>
    state === "closed"
        ? { "data-state": state, "aria-hidden": "true", inert: true }
        : state === "open"
          ? { "data-state": state }
          : {};

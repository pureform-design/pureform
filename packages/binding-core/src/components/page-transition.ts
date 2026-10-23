// The pages of a page transition, shared by the fade through and the horizontal shared axis in
// every binding. A root shows the page a key names (a destination's value, a step's index); when
// the key changes, the page shown before leaves and the new one enters. The binding keeps a
// leaving page, inert and hidden from assistive technology, until its motion ends
// (`settlePage`), and each page's content as it last was (`keepContents`).

/** What names a page: a navigation destination's value, a tab's or step's index. */
export type PageKey = string | number;

/** Where a page is: shown and still, coming in, or going out. */
export type PageState = "current" | "entering" | "leaving";

/** Which way a change goes: to a later page, or an earlier one. */
export type PageDirection = "forward" | "backward";

/** A page the root shows: its key, where it is, and, for a transition along an axis, which way
 *  it moves. */
export interface TransitionPage {
    readonly key: PageKey;
    readonly state: PageState;
    readonly direction: PageDirection | undefined;
}

/** How a change runs: its direction (none for a transition that doesn't move along an axis),
 *  and whether pages still leaving from earlier changes stay until their own motion ends
 *  (`true`) or go at once, so at most two pages show. */
export interface PageChange {
    readonly direction?: PageDirection | undefined;
    readonly keepLeaving?: boolean | undefined;
}

/** The first page, shown without motion. */
export const startPages = (key: PageKey): readonly TransitionPage[] => [
    { key, state: "current", direction: undefined },
];

/** The pages after a change to `key`: the page shown before leaves and the new one enters. A
 *  page still leaving with that key gives way to the new one. The same key changes nothing. */
export const changePages = (
    pages: readonly TransitionPage[],
    key: PageKey,
    change: PageChange = {},
): readonly TransitionPage[] => {
    const shown = pages.find((page) => page.state !== "leaving");
    if (!shown) return startPages(key);
    if (shown.key === key) return pages;
    const { direction } = change;
    const left = change.keepLeaving
        ? pages.filter((page) => page.state === "leaving" && page.key !== key)
        : [];
    return [
        ...left,
        { key: shown.key, state: "leaving", direction },
        { key, state: "entering", direction },
    ];
};

/** The pages once page `key`'s motion in `state` has ended: a leaving page goes, an entering one
 *  becomes current. A page that has since changed state is left as it is. */
export const settlePage = (
    pages: readonly TransitionPage[],
    key: PageKey,
    state: PageState,
): readonly TransitionPage[] => {
    const page = pages.find((p) => p.key === key && p.state === state);
    if (!page || state === "current") return pages;
    if (state === "leaving") return pages.filter((p) => p !== page);
    return pages.map((p) =>
        p === page ? { key, state: "current", direction: undefined } : p,
    );
};

/** Whether a page is still leaving, so the root clips it to its own size. */
export const pagesLeaving = (pages: readonly TransitionPage[]): boolean =>
    pages.some((page) => page.state === "leaving");

/** Whether a change is running: a page is still entering or leaving. */
export const pagesMoving = (pages: readonly TransitionPage[]): boolean =>
    pages.some((page) => page.state !== "current");

/** Keeps each page's content in `contents`: the shown key's from this render, a leaving page's
 *  as it last was, and none for a page that has gone. */
export const keepContents = <C>(
    contents: Map<PageKey, C>,
    pages: readonly TransitionPage[],
    key: PageKey,
    content: C,
): void => {
    contents.set(key, content);
    for (const shown of contents.keys()) {
        if (!pages.some((page) => page.key === shown)) contents.delete(shown);
    }
};

/** The attributes a leaving page takes: out of reach and hidden from assistive technology. */
export const LEAVING_PAGE_PROPS = {
    inert: true,
    "aria-hidden": "true",
} as const;

/** The root's attributes while a page leaves: `data-transitioning`, which clips the root. */
export const pageRootProps = (
    pages: readonly TransitionPage[],
): Readonly<Record<string, string>> =>
    pagesLeaving(pages) ? { "data-transitioning": "" } : {};

/** How a component with pages (the ready-made tabs, a horizontal stepper) moves between them. */
export interface PageTransitionProps {
    /** `"sharedAxis"` slides and fades the pages along the x axis, in their order (Material's
     *  horizontal shared axis, for spatially related pages); `"fadeThrough"` fades the old page
     *  out and the new one in as it grows (Material's fade through, for pages that aren't);
     *  `"none"` swaps them at once. @default "none" */
    readonly transition?: "none" | "fadeThrough" | "sharedAxis" | undefined;
    /** With `"sharedAxis"`, veil the page underneath while it moves. Off by default: Compose
     *  draws this scrim only behind predictive back, which pureform leaves out. @default false */
    readonly transitionScrim?: boolean | undefined;
}

/** The keys of `PageTransitionProps`. */
export const PAGE_TRANSITION_PROPS = [
    "transition",
    "transitionScrim",
] as const satisfies readonly (keyof PageTransitionProps)[];

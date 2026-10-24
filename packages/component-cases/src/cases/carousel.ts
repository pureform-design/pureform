// The carousel: a region of items, each a focusable mask. Every mask takes focus from Tab (Material's
// carousel: "Tab or Arrows moves to the previous or next carousel item"), the current page's
// marked `aria-current`; the arrow keys move focus to the item before or after, by direction, and scroll it into
// place, which changes the `page`. Enter and Space do nothing of their own: what an item does is
// the app's. It isn't a form control, and has no disabled state of its own (an item has).

import { carouselAnatomy, testIds } from "@pureform/anatomy";

import { optionalFlagOf } from "../aria";
import type { ComponentCase } from "../types";
import { itemSources } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.carousel;

const ITEMS = Array.from({ length: 8 }, (_, index) => ({
    "aria-label": `Place ${index + 1}`,
    content: `Place ${index + 1}`,
}));

const masks = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLElement>(`[data-testid="${ids.mask}"]`),
];

/** The page: the index of the item whose mask is current (`aria-current`). */
const read = (host: HTMLElement): number =>
    masks(host).findIndex((mask) => optionalFlagOf(mask, "current"));

export const carouselCase: ComponentCase = {
    component: "Carousel",
    props: { "aria-label": "Places", items: ITEMS },
    root: ids.root,
    // Its items are sized from the row's width once mounted.
    measured: true,
    examples: {
        "multi-browse": {},
        hero: { layout: "hero" },
        uncontained: { layout: "uncontained" },
        "multi-aspect": {
            layout: "multiAspect",
            items: ITEMS.map((item, index) => ({
                ...item,
                aspectRatio: [1, 0.75, 1.5][index % 3],
            })),
        },
        "full screen": { layout: "fullScreen" },
        "second page": { defaultPage: 1 },
    },
    state: {
        prop: "page",
        from: 0,
        to: 1,
        async act(host) {
            masks(host)[0]!.focus();
            await userEvent.keyboard("{ArrowRight}");
        },
        read,
    },
    keyboard: {
        focusable: (host) => masks(host)[Math.max(read(host), 0)]!,
        disables: false,
        keys: [
            { key: "{Enter}", does: "nothing" },
            { key: " ", does: "nothing" },
            { key: "{Home}", does: "nothing" },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "nothing" },
                { key: "{ArrowRight}", does: "change", to: 1 },
                { key: "{ArrowUp}", does: "nothing" },
                { key: "{ArrowDown}", does: "nothing" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: 1 },
                { key: "{ArrowRight}", does: "nothing" },
                { key: "{ArrowUp}", does: "nothing" },
                { key: "{ArrowDown}", does: "nothing" },
            ],
        },
    },
    // The carousel has no disabled state of its own; an item has.
    indication: itemSources(carouselAnatomy, ITEMS, { disabled: undefined }),
};

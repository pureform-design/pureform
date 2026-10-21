// Measuring a carousel's row for its layout: its width and height inside its padding, the gap
// between items, and how far it has scrolled from its start (a positive distance under `rtl`
// too). The row snaps its items to where its padding ends: its padding (and scroll padding) is
// the carousel's `padding` token, given to Zag's machine so both render from the server on.

import type { Registry } from "@pureform/styling";
import { tokenVar } from "@pureform/styling/theme-vars";

import type { CarouselMetrics } from "./components/carousel";

/** The row's padding for Zag's `padding` prop: the carousel's `padding` token, as the registry's
 *  target names its var. `undefined` without a registry. */
export const carouselRowPadding = (
    registry: Pick<Registry, "vars"> | undefined,
): string | undefined => {
    if (!registry) return undefined;
    const name = tokenVar("components.carousel.padding", registry.vars);
    return name && `var(${name})`;
};

const length = (value: string) => Number.parseFloat(value) || 0;

/** The row's metrics now. */
export const measureCarouselRow = (row: HTMLElement): CarouselMetrics => {
    const style = getComputedStyle(row);
    const start = length(style.paddingInlineStart);
    const end = length(style.paddingInlineEnd);
    return {
        viewport: Math.max(row.clientWidth - start - end, 0),
        height: Math.max(
            row.clientHeight -
                length(style.paddingBlockStart) -
                length(style.paddingBlockEnd),
            0,
        ),
        gap: length(style.columnGap),
        scroll: Math.abs(row.scrollLeft),
    };
};

/** Calls `onChange` with the row's metrics once laid out, and whenever it scrolls or resizes. Returns what
 *  stops it. */
export const observeCarouselRow = (
    row: HTMLElement,
    onChange: (metrics: CarouselMetrics) => void,
): (() => void) => {
    const update = () => {
        // Detached, it has no size yet: the resize observer calls again once it's laid out.
        if (!row.isConnected) return;
        onChange(measureCarouselRow(row));
    };
    // Not now: measuring forces the page's styles before it has them all (a runtime theme's block
    // comes in as the component mounts), so its colors would then tween from the old ones. The
    // resize observer first calls once the row is laid out.
    if (typeof ResizeObserver === "undefined") update();
    row.addEventListener("scroll", update, { passive: true });
    const resize =
        typeof ResizeObserver === "undefined"
            ? undefined
            : new ResizeObserver(update);
    resize?.observe(row);
    return () => {
        row.removeEventListener("scroll", update);
        resize?.disconnect();
    };
};

// Measuring a carousel's row for its layout: its width and height inside its padding, the gap
// between items, and how far it has scrolled from its start (a positive distance under `rtl`
// too). The row snaps its items to where its padding ends, so its scroll padding follows the
// padding the theme gives it.

import type { CarouselMetrics } from "./components/carousel";

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

/** Calls `onChange` with the row's metrics now, and whenever it scrolls or resizes. Returns what
 *  stops it. */
export const observeCarouselRow = (
    row: HTMLElement,
    onChange: (metrics: CarouselMetrics) => void,
): (() => void) => {
    const update = () => {
        // Detached, it has no size yet: the resize observer calls again once it's laid out.
        if (!row.isConnected) return;
        const metrics = measureCarouselRow(row);
        const style = getComputedStyle(row);
        row.style.scrollPaddingInline = `${style.paddingInlineStart} ${style.paddingInlineEnd}`;
        onChange(metrics);
    };
    update();
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

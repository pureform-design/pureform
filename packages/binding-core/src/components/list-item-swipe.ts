// A list item that slides to reveal an action, shared by every binding: the props, the maths of
// a drag (how far the row has slid, whether it settles open), the keys, and the tokens the
// preset's `swipeable` row reads. The binding owns the pointer, the offset, and `revealed`.

import type { Controllable } from "../controllable";

/** What a swipeable list item takes: whether its action is revealed, and how wide the action
 *  is. */
export interface ListItemSwipeProps extends Controllable<"revealed", boolean> {
    /** How far the row slides to uncover the action, in pixels. @default 80 */
    readonly swipeWidth?: number | undefined;
}

/** The keys of `ListItemSwipeProps`, which Root keeps off its element. */
export const LIST_ITEM_SWIPE_PROPS = [
    "revealed",
    "defaultRevealed",
    "onRevealedChange",
    "swipeWidth",
] as const satisfies readonly (keyof ListItemSwipeProps)[];

/** The action's width when `swipeWidth` isn't given, in pixels (the preset's `actionWidth`). */
export const LIST_ITEM_SWIPE_WIDTH = 80;

/** How far a pointer moves before a press is a drag, in pixels. */
export const LIST_ITEM_SWIPE_SLOP = 6;

/** How far the row has slid, `0` (closed) to `width` (the action fully shown), when the pointer
 *  that started at `from` is at `to`. The row slides toward the inline start, so in `ltr` a drag
 *  to the left opens it, and in `rtl` one to the right. `startOffset` is where it began. */
export const swipeOffsetOf = (
    startOffset: number,
    from: number,
    to: number,
    width: number,
    rtl: boolean,
): number => {
    const toward = rtl ? to - from : from - to;
    return Math.min(Math.max(startOffset + toward, 0), width);
};

/** Whether a row let go at `offset` settles open: past half the action's width. */
export const swipeSettlesOpen = (offset: number, width: number): boolean =>
    offset >= width / 2;

/** The offset a row rests at. */
export const swipeRestOffset = (revealed: boolean, width: number): number =>
    revealed ? width : 0;

/** What a key does to a focused swipeable row: the arrow toward the inline start reveals the
 *  action, the one away from it and Escape close it. */
export const swipeKeyAction = (
    key: string,
    rtl: boolean,
): "reveal" | "close" | undefined => {
    const toward = rtl ? "ArrowRight" : "ArrowLeft";
    const away = rtl ? "ArrowLeft" : "ArrowRight";
    if (key === toward) return "reveal";
    if (key === away || key === "Escape") return "close";
    return undefined;
};

/** The instance tokens the swipeable row reads: how far it has slid and how wide the action is,
 *  in pixels. */
export const swipeTokens = (offset: number, width: number) => ({
    swipeOffset: offset,
    actionWidth: width,
});

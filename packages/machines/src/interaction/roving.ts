/** How a row or column of focusable items moves focus with its arrow keys. */
export interface RovingOptions {
    /** A column's Up and Down keys rather than a row's Left and Right. */
    readonly vertical?: boolean | undefined;
    /** A row's keys flip in right-to-left. */
    readonly rtl?: boolean | undefined;
    /** Past either end, focus goes round to the other; else it stays at the end. */
    readonly loop?: boolean | undefined;
}

/** The index a key moves focus to from the item at `index` among `count`, or `undefined` for
 *  other keys: the orientation's forward and back keys, Home and End. */
export const rovingIndex = (
    key: string,
    index: number,
    count: number,
    { vertical = false, rtl = false, loop = false }: RovingOptions = {},
): number | undefined => {
    const forward = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    const back = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    if (key === forward)
        return loop ? (index + 1) % count : Math.min(index + 1, count - 1);
    if (key === back)
        return loop ? (index - 1 + count) % count : Math.max(index - 1, 0);
    if (key === "Home") return 0;
    if (key === "End") return count - 1;
    return undefined;
};

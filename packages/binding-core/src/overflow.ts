// Moving what doesn't fit into an overflow menu, as Android's `OverflowLinearLayout` does: the
// elements stay in order, and those from the first that doesn't fit onwards leave the row for a
// menu behind an overflow button, which then takes the row's last place. Framework-free: the web
// measures elements (`watchOverflow`, `@pureform/binding-web`), React Native its layouts.

/** What `overflowCount` lays out: each element's size along the row, the room the row has, the
 *  gap between elements, and the overflow button's size. */
export interface OverflowLayout {
    readonly sizes: readonly number[];
    readonly available: number;
    readonly gap: number;
    readonly trigger: number;
}

// Rounding in measured layouts can leave a row a fraction of a pixel short.
const EPSILON = 0.5;

/** How many elements stay in the row: all of them when they fit, else as many as fit before the
 *  overflow button. */
export const overflowCount = ({
    sizes,
    available,
    gap,
    trigger,
}: OverflowLayout): number => {
    const length = (sizes: readonly number[]) =>
        sizes.reduce((sum, size) => sum + size, 0) +
        gap * Math.max(0, sizes.length - 1);
    if (length(sizes) <= available + EPSILON) return sizes.length;
    let used = trigger;
    let count = 0;
    for (const size of sizes) {
        if (used + gap + size > available + EPSILON) break;
        used += gap + size;
        count += 1;
    }
    return count;
};

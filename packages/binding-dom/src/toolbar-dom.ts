// The toolbar on the web: `watchOverflow` measures a row's elements and the room its parent gives
// it, and reports how many stay in the row (`overflowCount`), again whenever the row or its parent
// resizes; `moveToolbarFocus` runs its arrow keys.

import { toolbarKeyTarget } from "@pureform/binding-core";
import { overflowCount } from "@pureform/binding-core";

/** What `watchOverflow` measures. `elements` are the row's elements in order, shown or not;
 *  hidden ones (taken out with `display: none`) keep the size they had when last shown. */
export interface OverflowWatch {
    readonly root: HTMLElement;
    readonly elements: () => readonly (HTMLElement | null | undefined)[];
    readonly trigger: () => HTMLElement | null | undefined;
    /** Whether the row runs down the block axis. */
    readonly vertical: () => boolean;
    readonly onCount: (count: number) => void;
}

const px = (value: string) => Number.parseFloat(value) || 0;

const shown = (element: HTMLElement) => element.getClientRects().length > 0;

/** Watches the row, calling `onCount` with how many elements fit. The row may grow up to its
 *  parent's content box: a floating toolbar hugs its elements, so its own size can't tell how
 *  much room it has. Returns `update`, to measure again after the elements change, and `stop`. */
export const watchOverflow = (watch: OverflowWatch) => {
    const sizes = new WeakMap<HTMLElement, number>();
    const size = (element: HTMLElement) => {
        if (shown(element)) {
            const rect = element.getBoundingClientRect();
            sizes.set(element, watch.vertical() ? rect.height : rect.width);
        }
        return sizes.get(element) ?? 0;
    };
    const update = () => {
        const { root } = watch;
        const vertical = watch.vertical();
        const style = getComputedStyle(root);
        const parent = root.parentElement;
        const own = vertical
            ? px(style.paddingTop) +
              px(style.paddingBottom) +
              px(style.borderTopWidth) +
              px(style.borderBottomWidth)
            : px(style.paddingLeft) +
              px(style.paddingRight) +
              px(style.borderLeftWidth) +
              px(style.borderRightWidth);
        let room: number;
        if (parent) {
            const outer = getComputedStyle(parent);
            room = vertical
                ? parent.clientHeight -
                  px(outer.paddingTop) -
                  px(outer.paddingBottom)
                : parent.clientWidth -
                  px(outer.paddingLeft) -
                  px(outer.paddingRight);
        } else {
            room = vertical ? root.clientHeight : root.clientWidth;
        }
        const trigger = watch.trigger();
        watch.onCount(
            overflowCount({
                sizes: watch
                    .elements()
                    .map((element) => (element ? size(element) : 0)),
                available: room - own,
                gap: px(vertical ? style.rowGap : style.columnGap),
                trigger: trigger ? size(trigger) : 0,
            }),
        );
    };
    const observer = new ResizeObserver(() => update());
    observer.observe(watch.root);
    if (watch.root.parentElement) observer.observe(watch.root.parentElement);
    update();
    return { update, stop: () => observer.disconnect() };
};

// The toolbar's elements that take focus: its buttons, and the overflow button, when shown.
const focusable = (root: HTMLElement) =>
    [
        ...root.querySelectorAll<HTMLElement>(
            "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        ),
    ].filter((element) => shown(element) && !element.closest("[role='menu']"));

/** Moves focus among the toolbar's elements as its arrow keys, Home and End ask
 *  (`toolbarKeyTarget`). Returns whether it handled the key, so the caller can prevent its
 *  default. */
export const moveToolbarFocus = (
    root: HTMLElement,
    key: string,
    orientation: unknown,
    dir: "ltr" | "rtl",
): boolean => {
    const elements = focusable(root);
    const index = elements.findIndex(
        (element) => element === document.activeElement,
    );
    if (index < 0) return false;
    const target = toolbarKeyTarget(
        key,
        index,
        elements.length,
        orientation === "vertical" ? "vertical" : "horizontal",
        dir,
    );
    if (target === undefined) return false;
    elements[target]?.focus();
    return true;
};

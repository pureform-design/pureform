// A region that scrolls has to be reachable by keyboard (axe's `scrollable-region-focusable`), so
// it's focusable while its content overflows it, and not otherwise: a body that fits stays out of
// the tab order. The bottom sheet's body uses it.

/** Makes `element` focusable (`tabindex="0"`) while its content overflows it, following its own
 *  size, its children's, and children coming and going. A `tabindex` the app gave it stays.
 *  Returns what stops it, and takes back a `tabindex` it set. */
export const focusableWhileOverflowing = (
    element: HTMLElement,
): (() => void) => {
    const own = element.hasAttribute("tabindex");
    if (own || typeof ResizeObserver === "undefined") return () => {};
    let set = false;
    const update = () => {
        const overflows =
            element.scrollHeight > element.clientHeight + 1 ||
            element.scrollWidth > element.clientWidth + 1;
        if (overflows === set) return;
        set = overflows;
        if (overflows) element.setAttribute("tabindex", "0");
        else element.removeAttribute("tabindex");
    };
    const sizes = new ResizeObserver(update);
    const observe = () => {
        sizes.disconnect();
        sizes.observe(element);
        for (const child of element.children) sizes.observe(child);
        update();
    };
    const children = new MutationObserver(observe);
    children.observe(element, { childList: true });
    observe();
    return () => {
        sizes.disconnect();
        children.disconnect();
        if (set) element.removeAttribute("tabindex");
    };
};

/** Scrolls `list` so `cell` shows: centred when `center` (a list just opened on it), else only as
 *  far as it takes to show it (a key or step that moved to it). Moves `list` alone, never the
 *  page around it, as `scrollIntoView` would. */
export const scrollCellIntoList = (
    list: HTMLElement,
    cell: HTMLElement,
    center: boolean,
): void => {
    const area = list.getBoundingClientRect();
    const box = cell.getBoundingClientRect();
    if (center) {
        list.scrollTop +=
            box.top - area.top - (list.clientHeight - box.height) / 2;
    } else if (box.top < area.top) {
        list.scrollTop -= area.top - box.top;
    } else if (box.bottom > area.bottom) {
        list.scrollTop += box.bottom - area.bottom;
    }
};

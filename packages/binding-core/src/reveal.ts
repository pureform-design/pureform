// Brings an item of a scrolling row (a scrollable tab list) into view, along the row only.

/** Scrolls `item`'s nearest scrolling ancestor so the item shows whole, by as little as it
 *  takes: a scrollable tab list's newly selected tab. Moves only that ancestor's inline scroll,
 *  never the page's. Does nothing without an item or a scrolling ancestor. */
export const revealInRow = (item: Element | null | undefined): void => {
    let row = item?.parentElement;
    while (row && !/auto|scroll/.test(getComputedStyle(row).overflowX)) {
        row = row.parentElement;
    }
    if (!item || !row || row.scrollWidth <= row.clientWidth) return;
    const box = item.getBoundingClientRect();
    const view = row.getBoundingClientRect();
    const style = getComputedStyle(row);
    const start = view.left + parseFloat(style.paddingLeft || "0");
    const end = view.right - parseFloat(style.paddingRight || "0");
    if (box.left < start) row.scrollLeft -= start - box.left;
    else if (box.right > end) row.scrollLeft += box.right - end;
};

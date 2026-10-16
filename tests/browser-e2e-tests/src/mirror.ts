// Mirrored boxes: in right to left, every part of a component should sit where its left to
// right box lands when flipped across the component's root. Measure the same parts in each
// direction and compare.

/** A box relative to a root's border box, in CSS pixels. */
export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Each element's box relative to `root`'s border box, by name, transforms included. */
export const boxesWithin = (
    root: Element,
    elements: Record<string, Element>,
): Record<string, Box> => {
    const origin = root.getBoundingClientRect();
    return Object.fromEntries(
        Object.entries(elements).map(([name, element]) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return [name, { x: x - origin.x, y: y - origin.y, width, height }];
        }),
    );
};

/** `box` mirrored across a root `width` wide: `x' = width - x - w`. */
export const mirrorBox = (box: Box, width: number): Box => ({
    ...box,
    x: width - box.x - box.width,
});

/** Where the `rtl` boxes don't mirror the `ltr` ones across a root `width` wide, by more than
 *  `tolerance` pixels on any side, one line per box; empty when they all mirror. Boxes missing
 *  from either side count as mismatches. */
export const mirrorMismatches = (
    ltr: Record<string, Box>,
    rtl: Record<string, Box>,
    width: number,
    tolerance = 0.5,
): string[] => {
    const names = new Set([...Object.keys(ltr), ...Object.keys(rtl)]);
    const round = (box: Box) =>
        `x ${box.x.toFixed(2)}, y ${box.y.toFixed(2)}, ${box.width.toFixed(2)} by ${box.height.toFixed(2)}`;
    return [...names].flatMap((name) => {
        const from = ltr[name];
        const to = rtl[name];
        if (!from || !to) return [`${name}: measured in one direction only`];
        const expected = mirrorBox(from, width);
        const off = (["x", "y", "width", "height"] as const).some(
            (key) => Math.abs(expected[key] - to[key]) > tolerance,
        );
        return off
            ? [`${name}: expected ${round(expected)}, got ${round(to)}`]
            : [];
    });
};

/** Render `markup` inside an element with `dir` set, in a document with `css`, and measure
 *  each `[data-part]` element against the `[data-root]` one, by its `data-part` name. `prepare`
 *  runs before measuring, on the root (to pause an animation at a set time, for example). */
export const measureIn = (
    doc: Document,
    dir: "ltr" | "rtl",
    markup: string,
    prepare?: (root: HTMLElement) => void,
): { width: number; boxes: Record<string, Box> } => {
    const holder = doc.createElement("div");
    holder.dir = dir;
    holder.innerHTML = markup;
    doc.body.append(holder);
    try {
        const root = holder.querySelector<HTMLElement>("[data-root]");
        if (!root) throw new Error("no [data-root] element in the markup");
        prepare?.(root);
        const parts = Object.fromEntries(
            [...root.querySelectorAll<HTMLElement>("[data-part]")].map(
                (element) => [element.dataset.part!, element],
            ),
        );
        return {
            width: root.getBoundingClientRect().width,
            boxes: boxesWithin(root, parts),
        };
    } finally {
        holder.remove();
    }
};

/** Measure `markup` both ways in `doc`, and list where `rtl` doesn't mirror `ltr` (see
 *  `mirrorMismatches`). */
export const mirroredBoxMismatches = (
    doc: Document,
    markup: string,
    prepare?: (root: HTMLElement) => void,
    tolerance?: number,
): string[] => {
    const ltr = measureIn(doc, "ltr", markup, prepare);
    const rtl = measureIn(doc, "rtl", markup, prepare);
    if (Math.abs(ltr.width - rtl.width) > (tolerance ?? 0.5)) {
        return [`root: ${ltr.width}px wide in ltr, ${rtl.width}px in rtl`];
    }
    return mirrorMismatches(ltr.boxes, rtl.boxes, ltr.width, tolerance);
};

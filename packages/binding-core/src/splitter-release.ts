// The web splitter's release: snaps the panes beside the divider let go to the nearest anchor
// and settles them there on Compose's spring from the drag's speed. React and Solid share it.

import {
    SPLITTER_ANCHORS,
    SPLITTER_SETTLE,
    splitterLimits,
    splitterSnap,
} from "./components/splitter";
import type { SplitterAnchor, SplitterPanelData } from "./components/splitter";
import { settleOnSpring } from "./settle";

/** The panes' room along the axis: the root less its dividers. */
export const splitterRoom = (
    root: HTMLElement | null | undefined,
    horizontal: boolean,
): number => {
    if (!root) return 0;
    const length = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return horizontal ? rect.width : rect.height;
    };
    let room = length(root);
    for (const child of root.children)
        if (child.getAttribute("data-part") === "resize-trigger")
            room -= length(child);
    return room;
};

/** Where the panes go once the divider `trigger` (`"list:detail"`) is let go at `sizes`, with
 *  the drag's `velocity` (px/ms toward the end). When the snap moves them, the two panes beside
 *  the divider start settling there and it returns the snapped sizes, for the machine's
 *  `SIZE.SET`, and what stops the settle; otherwise `undefined`. */
export const splitterRelease = (options: {
    readonly root: HTMLElement | null | undefined;
    readonly horizontal: boolean;
    readonly trigger: string;
    readonly sizes: readonly number[];
    readonly panels: readonly SplitterPanelData[];
    readonly anchors?: readonly SplitterAnchor[] | undefined;
    readonly velocity: number;
}):
    | { readonly sizes: number[]; readonly stopSettle: () => void }
    | undefined => {
    const { root, sizes, panels, velocity } = options;
    const index = panels.findIndex(
        (panel) => panel.id === options.trigger.split(":")[0],
    );
    const room = splitterRoom(root, options.horizontal);
    const snapped = splitterSnap({
        sizes,
        index,
        room,
        anchors: options.anchors ?? SPLITTER_ANCHORS,
        limits: splitterLimits(panels, room),
        velocity,
    });
    if (snapped.every((size, at) => size === sizes[at])) return undefined;
    const panes = [...(root?.children ?? [])].filter(
        (child) => child.getAttribute("data-part") === "panel",
    ) as HTMLElement[];
    const stopSettle = settleOnSpring(
        panes.slice(index, index + 2),
        "flex-grow",
        SPLITTER_SETTLE,
        ((snapped[index]! - sizes[index]!) / 100) * room,
        velocity / 1000,
    );
    return { sizes: snapped, stopSettle };
};

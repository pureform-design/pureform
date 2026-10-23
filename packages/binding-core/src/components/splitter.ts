// The splitter's contract, shared by every binding: panes (Zag's splitter's panels) with a divider
// between each pair that a drag or the arrow keys move, as in Material 3's adaptive list-detail
// layouts (Compose's `VerticalDragHandle` with `ThreePaneScaffold`'s pane expansion). Sizes are
// percent of the panes' room. When a drag lets go, the divider snaps to the nearest anchor, or to
// the next one the way it was flung, as Compose's `PaneExpansionState` does.

import type {
    PartName,
    splitterAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The splitter's parts: `"root" | "panel" | "resizeTrigger" | "resizeTriggerIndicator"`. */
export type SplitterPart = PartName<typeof splitterAnatomy>;

/** A pane's size: percent of the panes' room as a number or `"40%"`, or `"240px"`. */
export type SplitterSize = number | string;

/** One pane: its id, and the room it may take. */
export interface SplitterPanelData {
    readonly id: string;
    /** The least room it takes; a drag, a key or a snap stops there. */
    readonly minSize?: SplitterSize | undefined;
    /** The most room it takes. */
    readonly maxSize?: SplitterSize | undefined;
}

/** Where a divider snaps when a drag lets go of it, from the start of the panes before it:
 *  a proportion of the room (`{ proportion: 0.5 }`), or an offset from the start or the end
 *  (`{ offset: 240, from: "end" }`), as Compose's `PaneExpansionAnchor`s. */
export type SplitterAnchor =
    | { readonly proportion: number }
    | { readonly offset: number; readonly from?: "start" | "end" | undefined };

/** The anchors Compose's adaptive samples snap a list-detail divider to (`PaneExpansionAnchors`
 *  in androidx's `ThreePaneScaffoldSample.kt`): either edge, 240dp from either edge, and half.
 *  Compose itself has none by default; `anchors={[]}` resizes freely. */
export const SPLITTER_ANCHORS: readonly SplitterAnchor[] = [
    { proportion: 0 },
    { offset: 240, from: "start" },
    { proportion: 0.5 },
    { offset: 240, from: "end" },
    { proportion: 1 },
];

/** How fast a fling has to be (px/s) to snap to the next anchor its way rather than the nearest
 *  (Compose's `AnchoringVelocityThreshold`). */
export const SPLITTER_FLING_VELOCITY = 200;

/** The splitter's variant groups and instance tokens. */
export interface SplitterVariantProps {
    /** `horizontal` lays the panes side by side, `vertical` stacks them. @default "horizontal" */
    readonly orientation?: VariantProp<"splitter", "orientation">;
    readonly tokens?: InstanceTokens<"splitter"> | undefined;
}

/** What a size change reports: each pane's size, in percent. */
export interface SplitterSizeDetails {
    readonly size: number[];
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SplitterRootOwnProps extends SplitterVariantProps {
    /** The panes, in order. */
    readonly panels: readonly SplitterPanelData[];
    /** Each pane's size, controlled. */
    readonly size?: readonly SplitterSize[] | undefined;
    /** Each pane's size to start with. Left out, they share the room. */
    readonly defaultSize?: readonly SplitterSize[] | undefined;
    /** Called as the sizes change: while dragging, on a key, on a snap. */
    readonly onSizeChange?:
        | ((details: SplitterSizeDetails) => void)
        | undefined;
    /** Where a dragged divider snaps when let go. `[]` lets it rest where it's let go.
     *  @default SPLITTER_ANCHORS */
    readonly anchors?: readonly SplitterAnchor[] | undefined;
    /** How far an arrow key moves a divider, in percent (Shift: 10). @default 1 */
    readonly keyboardResizeBy?: number | undefined;
    /** Root's id, also the machine's.
     *  @control none */
    readonly id?: string | undefined;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<SplitterPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SplitterPart> | undefined;
}

/** The keys of `SplitterRootOwnProps`, which Root keeps off its element. */
export const SPLITTER_ROOT_PROPS = [
    "orientation",
    "tokens",
    "panels",
    "size",
    "defaultSize",
    "onSizeChange",
    "anchors",
    "keyboardResizeBy",
    "id",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof SplitterRootOwnProps)[];

/** A pane of the ready-made splitter: its data and what it shows. */
export interface SplitterPane<Node> extends SplitterPanelData {
    readonly content?: Node;
}

/** What the ready-made splitter renders inside Root, in the framework's node type. */
export interface SplitterContentProps<Node> {
    /** The panes, in order, each with its content; a divider goes between each pair. */
    readonly panes: readonly SplitterPane<Node>[];
    /** The dividers' name, for assistive technology. @default "Resize panes" */
    readonly resizeLabel?: string | undefined;
}

/** The registry selection from Root's props. */
export const splitterSelection = (
    props: SplitterVariantProps,
): Selection<"splitter"> => ({
    orientation: props.orientation,
    tokens: props.tokens,
});

/** The orientation the machine and the layout take. */
export const splitterOrientation = (
    props: Pick<SplitterVariantProps, "orientation">,
): "horizontal" | "vertical" =>
    props.orientation === "vertical" ? "vertical" : "horizontal";

/** The machine's props from Root's, besides the sizes (`splitterSizeProps`). */
export const splitterMachineProps = (
    props: Pick<
        SplitterRootOwnProps,
        "id" | "orientation" | "panels" | "keyboardResizeBy"
    >,
) => ({
    id: props.id,
    orientation: splitterOrientation(props),
    panels: props.panels.map((panel) => ({ ...panel })),
    keyboardResizeBy: props.keyboardResizeBy,
});

/** The machine's size props from the controllable ones (`size`, `defaultSize`, `onSizeChange`).
 *  Without either size, the panes share the room from the first render, so the server draws
 *  what the browser does. */
export const splitterSizeProps = (
    props: Pick<SplitterRootOwnProps, "size" | "defaultSize" | "onSizeChange">,
    panels: readonly SplitterPanelData[],
) => ({
    size: props.size === undefined ? undefined : [...props.size],
    defaultSize:
        props.defaultSize === undefined
            ? props.size === undefined
                ? splitterInitialSizes(panels, undefined, 0)
                : undefined
            : [...props.defaultSize],
    onResize:
        props.onSizeChange &&
        ((details: { size: number[] }) =>
            props.onSizeChange?.({ size: details.size })),
});

/** The divider between `before` and `after`, as the machine names it. */
export const splitterTriggerId = (before: string, after: string) =>
    `${before}:${after}` as const;

/** A size in percent of `room` (px), or `fallback` when it can't be read. */
export const splitterPercent = (
    size: SplitterSize | undefined,
    room: number,
    fallback: number,
): number => {
    if (size === undefined) return fallback;
    if (typeof size === "number") return size;
    const match = /^(-?\d*\.?\d+)(%|px)?$/.exec(size.trim());
    if (!match) return fallback;
    const value = Number.parseFloat(match[1]!);
    if (match[2] === "px") return room > 0 ? (value / room) * 100 : fallback;
    return value;
};

/** Each pane's least and most size, in percent of `room`. */
export const splitterLimits = (
    panels: readonly SplitterPanelData[],
    room: number,
) =>
    panels.map((panel) => ({
        min: splitterPercent(panel.minSize, room, 0),
        max: splitterPercent(panel.maxSize, room, 100),
    }));

/** Each pane's starting size in percent: `defaultSize` where given, the rest shared out. */
export const splitterInitialSizes = (
    panels: readonly SplitterPanelData[],
    sizes: readonly SplitterSize[] | undefined,
    room: number,
): number[] => {
    const given = panels.map((_, index) =>
        sizes?.[index] === undefined
            ? undefined
            : splitterPercent(sizes[index], room, Number.NaN),
    );
    const taken = given.reduce<number>(
        (sum, size) =>
            sum + (size !== undefined && !Number.isNaN(size) ? size : 0),
        0,
    );
    const open = given.filter(
        (size) => size === undefined || Number.isNaN(size),
    );
    const share = open.length > 0 ? Math.max(0, 100 - taken) / open.length : 0;
    return given.map((size) =>
        size === undefined || Number.isNaN(size) ? share : size,
    );
};

/** Where divider `index` (between panes `index` and `index + 1`) may sit, in percent from the
 *  start: as far as both its panes' least and most sizes allow. */
const dividerRange = (
    sizes: readonly number[],
    index: number,
    limits: readonly { min: number; max: number }[],
) => {
    const start = sizes.slice(0, index).reduce((sum, size) => sum + size, 0);
    const end = start + sizes[index]! + sizes[index + 1]!;
    const before = limits[index] ?? { min: 0, max: 100 };
    const after = limits[index + 1] ?? { min: 0, max: 100 };
    return {
        start,
        end,
        low: Math.max(start + before.min, end - after.max),
        high: Math.min(start + before.max, end - after.min),
    };
};

/** The sizes with divider `index` moved by `delta` percent (toward the end when positive),
 *  stopped at its panes' limits. React Native's drag and keys; the web's are Zag's. */
export const splitterMoveBy = (
    sizes: readonly number[],
    index: number,
    delta: number,
    limits: readonly { min: number; max: number }[],
): number[] => {
    if (index < 0 || index + 1 >= sizes.length) return [...sizes];
    const range = dividerRange(sizes, index, limits);
    const at = range.start + sizes[index]!;
    const to = Math.min(range.high, Math.max(range.low, at + delta));
    const next = [...sizes];
    next[index] = to - range.start;
    next[index + 1] = range.end - to;
    return next;
};

/** An anchor's place, in percent of `room` (px) from the start. */
const anchorAt = (anchor: SplitterAnchor, room: number): number => {
    if ("proportion" in anchor) return anchor.proportion * 100;
    if (room <= 0) return Number.NaN;
    const at = (anchor.offset / room) * 100;
    return anchor.from === "end" ? 100 - at : at;
};

/** The sizes once divider `index` snaps to an anchor, after a drag let go of it at `velocity`
 *  (px/s, positive toward the end). Below `SPLITTER_FLING_VELOCITY` it takes the nearest
 *  anchor; above, the nearest one the way it was flung, or the nearest if there's none that
 *  way (Compose's `getPositionOfTheClosestAnchor`). Anchors past a pane's limits stop at them.
 *  `room` is the panes' room in px; without anchors the sizes stay. */
export const splitterSnap = (options: {
    readonly sizes: readonly number[];
    readonly index: number;
    readonly room: number;
    readonly anchors: readonly SplitterAnchor[];
    readonly limits: readonly { min: number; max: number }[];
    readonly velocity?: number | undefined;
}): number[] => {
    const { sizes, index, room, anchors, limits, velocity = 0 } = options;
    if (anchors.length === 0 || index < 0 || index + 1 >= sizes.length)
        return [...sizes];
    const range = dividerRange(sizes, index, limits);
    const at = range.start + sizes[index]!;
    const places = anchors
        .map((anchor) => anchorAt(anchor, room))
        .filter((place) => Number.isFinite(place))
        .map((place) => Math.min(range.high, Math.max(range.low, place)));
    if (places.length === 0) return [...sizes];
    const way =
        velocity >= SPLITTER_FLING_VELOCITY
            ? 1
            : velocity <= -SPLITTER_FLING_VELOCITY
              ? -1
              : 0;
    const EPSILON = 1e-6;
    const ahead = places.filter((place) =>
        way > 0 ? place > at + EPSILON : place < at - EPSILON,
    );
    const pool = way !== 0 && ahead.length > 0 ? ahead : places;
    const to = pool.reduce((best, place) =>
        Math.abs(place - at) < Math.abs(best - at) ? place : best,
    );
    return splitterMoveBy(sizes, index, to - at, limits);
};

/** Tracks a drag's speed from its last moves, for the snap. `position` is along the panes'
 *  axis, toward the end; `time` in ms. */
export const createDragVelocity = (window = 100) => {
    let samples: { position: number; time: number }[] = [];
    return {
        reset() {
            samples = [];
        },
        add(position: number, time: number) {
            samples.push({ position, time });
            samples = samples.filter((sample) => time - sample.time <= window);
        },
        /** px/s over the last `window` ms. */
        velocity(): number {
            const first = samples[0];
            const last = samples.at(-1);
            if (!first || !last || last.time === first.time) return 0;
            return (
                ((last.position - first.position) / (last.time - first.time)) *
                1000
            );
        },
    };
};

/** The divider's element props beside the machine's: named by `label`, marked pressed while
 *  dragged so the pill stays grown when the pointer leaves it. */
export const splitterTriggerProps = (options: {
    readonly label?: string | undefined;
    readonly dragging: boolean;
}) => ({
    "aria-label": options.label ?? "Resize panes",
    "data-pf-active": options.dragging ? "" : undefined,
});

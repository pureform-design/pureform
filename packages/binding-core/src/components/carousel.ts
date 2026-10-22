// The carousel's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's carousel machine, the items the ready-made carousel takes as data,
// and the layout: how big each item is, and where its mask sits as the row scrolls.
//
// Material sizes a carousel's items with keylines: the sizes the items take at rest, from the
// row's start (`multiBrowse`: large items, then a medium and a small one). Every item keeps the
// large size in the row (its slot), so the row scrolls and snaps by a constant step, and its mask
// is drawn at the keyline the item has reached, between two keylines while it moves. Near the end
// of the row the keylines turn round (the small one first), so the last item ends up large.
// Uncontained, multi-aspect and full-screen items aren't masked: the mask is the slot.

import type {
    carouselAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { VariantProp } from "./variants";

/** The carousel's parts: `"root" | "itemGroup"` (the scrolling row) `| "item"` (an item's place
 *  in it) `| "mask"` (the rounded item people see) `| "content"`. */
export type CarouselPart = PartName<typeof carouselAnatomy>;

/** The carousel's layouts, Material's strategies. */
export type CarouselLayout =
    | "multiBrowse"
    | "hero"
    | "uncontained"
    | "multiAspect"
    | "fullScreen";

/** The fixed sizes of Material's carousel items, in pixels: a small item is 40 to 56 wide, and a
 *  large one 186 unless `itemWidth` says otherwise. */
export const CAROUSEL_SIZES = {
    smallMin: 40,
    smallMax: 56,
    itemWidth: 186,
} as const;

/** The carousel's variant groups and instance tokens. */
export interface CarouselVariantProps {
    /** How the items are sized. @default "multiBrowse" */
    readonly layout?: VariantProp<"carousel", "layout">;
    readonly tokens?: InstanceTokens<"carousel"> | undefined;
}

/** What Zag's carousel machine takes from Root's props. The page is the index of the item the row
 *  is snapped to. */
export interface CarouselBehaviorProps extends Controllable<"page", number> {
    /** A large item's width, in pixels: `multiBrowse` fits as many as it can, then a medium and
     *  a small one; `uncontained` items are all this wide. @default 186 */
    readonly itemWidth?: number | undefined;
    /** Whether a mouse can drag the row. @default false */
    readonly allowMouseDrag?: boolean | undefined;
    /** Root's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface CarouselRootOwnProps
    extends CarouselVariantProps, CarouselBehaviorProps, IndicationProps {
    /** A prefix for every part's test id, or ids by part. */
    readonly testId?: TestIdOverride<CarouselPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<CarouselPart> | undefined;
}

/** The keys of `CarouselRootOwnProps`, which Root keeps off its element. */
export const CAROUSEL_ROOT_PROPS = [
    "layout",
    "tokens",
    "itemWidth",
    "allowMouseDrag",
    "id",
    "page",
    "defaultPage",
    "onPageChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof CarouselRootOwnProps)[];

/** One item of the ready-made carousel, as data. */
export interface CarouselItem<Node = unknown> extends InteractionSourceProps {
    /** What the item shows, usually a picture filling it. */
    readonly content?: Node;
    /** The item's name, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    /** Width over height, for a `multiAspect` item. */
    readonly aspectRatio?: number | undefined;
    readonly disabled?: boolean | undefined;
}

/** What the ready-made carousel renders inside Root, in the framework's node type. */
export interface CarouselContentProps<Node> {
    /** The items, in order. */
    readonly items?: readonly CarouselItem<Node>[] | undefined;
}

/** The keys of `CarouselContentProps`. */
export const CAROUSEL_CONTENT_PROPS = [
    "items",
] as const satisfies readonly (keyof CarouselContentProps<unknown>)[];

/** The carousel's registry selection from Root's props. */
export const carouselSelection = (
    props: CarouselVariantProps,
): Selection<"carousel"> => ({
    layout: props.layout,
    tokens: props.tokens,
});

/** Zag's carousel props from Root's, besides `id`, `dir`, `slideCount` and the controllable
 *  `page`. Root's `id` becomes Zag's root id. */
export const carouselMachineProps = (props: CarouselBehaviorProps) => ({
    allowMouseDrag: props.allowMouseDrag,
    ids: props.id === undefined ? undefined : { root: props.id },
});

/** What the layout reads from the row, in pixels. */
export interface CarouselMetrics {
    /** The row's width inside its padding. */
    readonly viewport: number;
    /** The row's height inside its padding: a `multiAspect` item's height. */
    readonly height: number;
    readonly gap: number;
    /** How far the row has scrolled from its start, whatever the direction. */
    readonly scroll: number;
}

/** What the layout needs besides the row's metrics. */
export interface CarouselLayoutOptions {
    /** A layout the registry doesn't know is laid out as `multiBrowse`. */
    readonly layout?: unknown;
    readonly count: number;
    readonly itemWidth?: number | undefined;
    /** Each item's width over height, for `multiAspect`. */
    readonly aspectRatios?: readonly (number | undefined)[] | undefined;
}

/** An item's sizes: its slot's width (and its content's), and its mask's width and inline offset
 *  from the slot's start. */
export interface CarouselItemSize {
    readonly slot: number;
    readonly mask: number;
    readonly offset: number;
}

const LAYOUTS: readonly string[] = [
    "multiBrowse",
    "hero",
    "uncontained",
    "multiAspect",
    "fullScreen",
] satisfies readonly CarouselLayout[];

const isCarouselLayout = (layout: unknown): layout is CarouselLayout =>
    typeof layout === "string" && LAYOUTS.includes(layout);

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

/** The sizes the items take at rest, from the row's start, filling `viewport`: Material's
 *  keylines for the masked layouts, empty for the others. */
export const carouselKeylines = (
    layout: CarouselLayout,
    viewport: number,
    gap: number,
    itemWidth: number = CAROUSEL_SIZES.itemWidth,
): number[] => {
    const small = CAROUSEL_SIZES.smallMax;
    if (layout !== "multiBrowse" && layout !== "hero") return [];
    // Too narrow for anything beside a large item.
    if (viewport <= small * 2 + gap) return [Math.max(viewport, 0)];
    if (layout === "hero") return [viewport - small - gap, small];
    const large = Math.min(itemWidth, viewport - small - gap);
    // As many large items as fit before a small one with room for a medium one between.
    let count = Math.max(
        1,
        Math.floor((viewport - small - gap - small - gap) / (large + gap)),
    );
    let medium = viewport - count * (large + gap) - small - gap;
    if (medium <= small && count > 1) {
        count -= 1;
        medium += large + gap;
    }
    if (medium <= small) {
        // No room for a medium item: one large item and a small one.
        return [viewport - small - gap, small];
    }
    // A medium item is never larger than a large one: the large ones take what's over.
    const mediumSize = clamp(medium, small, large);
    const largeSize =
        (viewport - small - gap - mediumSize - count * gap) / count;
    return [...Array<number>(count).fill(largeSize), mediumSize, small];
};

// The start of each keyline in `sizes`, from the row's start.
const starts = (sizes: readonly number[], gap: number) => {
    let at = 0;
    return sizes.map((size) => {
        const start = at;
        at += size + gap;
        return start;
    });
};

// Where an item whose slot starts `slotStart` along the row is drawn, and how wide, at fraction
// `u` of a step past the keylines' start: between keyline `floor(u)` and the next. Before the
// first keyline and past the last, it takes the smallest size and moves on with the row.
const between = (
    keylines: readonly number[],
    gap: number,
    step: number,
    u: number,
) => {
    const last = keylines.length - 1;
    const small = Math.min(...keylines);
    const at = starts(keylines, gap);
    // Extend the keylines by a small one either side, off the row.
    const size = (index: number) =>
        index < 0 || index > last ? small : keylines[index]!;
    const start = (index: number) =>
        index < 0
            ? -(small + gap) + (index + 1) * step
            : index > last
              ? at[last]! + keylines[last]! + gap + (index - last - 1) * step
              : at[index]!;
    const index = Math.floor(u);
    const t = u - index;
    return {
        start: start(index) + (start(index + 1) - start(index)) * t,
        size: size(index) + (size(index + 1) - size(index)) * t,
    };
};

/** Every item's slot, mask and offset, for the row's metrics and scroll. */
export const carouselItemSizes = (
    options: CarouselLayoutOptions,
    metrics: CarouselMetrics,
): CarouselItemSize[] => {
    const layout = isCarouselLayout(options.layout)
        ? options.layout
        : "multiBrowse";
    const { viewport, gap, height, scroll } = metrics;
    const itemWidth = options.itemWidth ?? CAROUSEL_SIZES.itemWidth;
    const indices = Array.from({ length: options.count }, (_, index) => index);
    if (layout === "fullScreen") {
        return indices.map(() => ({
            slot: viewport,
            mask: viewport,
            offset: 0,
        }));
    }
    if (layout === "uncontained" || layout === "multiAspect") {
        return indices.map((index) => {
            const ratio =
                layout === "multiAspect"
                    ? options.aspectRatios?.[index]
                    : undefined;
            const slot = ratio && height > 0 ? ratio * height : itemWidth;
            return { slot, mask: slot, offset: 0 };
        });
    }
    const keylines = carouselKeylines(layout, viewport, gap, itemWidth);
    const slot = keylines[0] ?? 0;
    const step = slot + gap;
    const reversed = [...keylines].reverse();
    // How far the row scrolls, and how long before its end the keylines turn round.
    const end = Math.max(options.count * step - gap - viewport, 0);
    const turn = Math.min(end, (keylines.length - 1) * step);
    const t = turn > 0 ? clamp((scroll - (end - turn)) / turn, 0, 1) : 0;
    // The keylines turned round put the last item on the last one once the row has scrolled to
    // its end.
    const endShift = viewport - slot - (keylines.length - 1) * step;
    return indices.map((index) => {
        const x = index * step - scroll;
        const fromStart = between(keylines, gap, step, x / step);
        const fromEnd = between(reversed, gap, step, (x - endShift) / step);
        const start = fromStart.start + (fromEnd.start - fromStart.start) * t;
        const mask = fromStart.size + (fromEnd.size - fromStart.size) * t;
        return { slot, mask, offset: start - x };
    });
};

/** The sizes the items take before the row is measured (on the server, and the first paint): a
 *  large item each, or the row's width full screen. */
export const carouselInitialStyle = (
    layout: unknown,
    itemWidth: number = CAROUSEL_SIZES.itemWidth,
): string | undefined => (layout === "fullScreen" ? "100%" : `${itemWidth}px`);

// The carousel: Root on the carousel machine (Zag's), the scrolling row of items, each item's mask
// (the rounded item people see, which takes focus and presses) and its content, and the
// ready-made Carousel over them. The row is measured as it scrolls and resizes, and each item is
// sized from the layout: its slot and content keep the large size, while its mask's width and
// offset follow the scroll, so the content stays put as the mask around it shrinks.

import { carouselAnatomy } from "@pureform/anatomy";
import {
    CAROUSEL_CONTENT_PROPS,
    CAROUSEL_ROOT_PROPS,
    carouselInitialStyle,
    carouselItemSizes,
    carouselMachineProps,
    carouselSelection,
} from "@pureform/binding-core";
import type {
    CarouselContentProps,
    CarouselInstances,
    CarouselItemInstance,
    CarouselItem,
    CarouselItemSize,
    CarouselMetrics,
    CarouselRootOwnProps,
    InteractionSourceProps,
} from "@pureform/binding-core";
import { carouselRowPadding, observeCarouselRow } from "@pureform/binding-dom";
import * as carousel from "@pureform/machines/carousel";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    omit,
    onCleanup,
} from "solid-js";

import { useControllable } from "../controllable";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { useReducedMotion } from "../motion";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection, usePureform } from "../provider";

type Anatomy = typeof carouselAnatomy;

/** What Root shares with its parts. */
interface CarouselContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<carousel.Api<PropTypes>>;
    readonly sources: ItemInteractionSources;
    /** An item's sizes, once the row is measured. */
    readonly size: (index: number) => CarouselItemSize | undefined;
    /** Its size before then. */
    readonly initial: Accessor<string | undefined>;
    readonly setMetrics: (metrics: CarouselMetrics) => void;
    readonly setAspectRatio: (index: number, ratio: number | undefined) => void;
}

/** What an item shares with its parts. */
interface ItemContextValue {
    readonly index: Accessor<number>;
}

const context = createPartContext<CarouselContextValue>("Carousel");
const itemContext = createPartContext<ItemContextValue>("Carousel", "Item");

/** Root's props: the variants and tokens, the machine's props (`page`, `itemWidth`, …), the
 *  number of items, `testId` and `unstyled` for every part, `as`, and the element's own props.
 *  Name it with `aria-label`. */
export interface CarouselRootProps
    extends Omit<PartProps, keyof CarouselRootOwnProps>, CarouselRootOwnProps {
    /** How many items the row holds. */
    readonly slideCount: number;
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface CarouselPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** An item's props: its index, and its width over height for `multiAspect`. */
export interface CarouselItemProps extends CarouselPartProps {
    readonly index: number;
    readonly aspectRatio?: number | undefined;
}

/** A mask's props: whether it's disabled, and the source its presses go to. */
export interface CarouselMaskProps
    extends CarouselPartProps, InteractionSourceProps {
    readonly disabled?: boolean | undefined;
}

const px = (value: number) => `${value}px`;

/** The carousel's root, a `<div>` region around the row. */
function Root(props: CarouselRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const reducedMotion = useReducedMotion();
    const page = useControllable<"page", number>("Carousel", "page", props);
    const sources = itemInteractionSources();
    const state = usePureform();
    const service = useMachine(carousel.machine, () => ({
        id,
        ...sources.machineProps,
        dir: dir(),
        slideCount: props.slideCount,
        padding: carouselRowPadding(state().registry),
        reducedMotion: reducedMotion(),
        ...carouselMachineProps(props),
        ...page.machineProps(),
    }));
    const api = createMemo(() => carousel.connect(service, normalizeProps));
    const scope = useComponent(carouselAnatomy, {
        selection: () => carouselSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    const [metrics, setMetrics] = createSignal<CarouselMetrics>();
    const [ratios, setRatios] = createSignal<
        Readonly<Record<number, number | undefined>>
    >({});
    const sizes = createMemo(() => {
        const measured = metrics();
        if (!measured) return undefined;
        const aspect = ratios();
        return carouselItemSizes(
            {
                layout: props.layout,
                count: props.slideCount,
                itemWidth: props.itemWidth,
                aspectRatios: Array.from(
                    { length: props.slideCount },
                    (_, index) => aspect[index],
                ),
            },
            measured,
        );
    });
    return (
        <context.Provider
            value={{
                scope,
                api,
                sources,
                size: (index) => sizes()?.[index],
                initial: () =>
                    carouselInitialStyle(props.layout, props.itemWidth),
                setMetrics,
                setAspectRatio: (index, ratio) =>
                    setRatios((all) =>
                        all[index] === ratio ? all : { ...all, [index]: ratio },
                    ),
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", "slideCount", ...CAROUSEL_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The row of items, which scrolls and snaps to each. */
function ItemGroup(props: CarouselPartProps): JSX.Element {
    const { scope, api, setMetrics } = context.use("ItemGroup");
    let stop: (() => void) | undefined;
    onCleanup(() => stop?.());
    return scope.render("itemGroup", {
        element: "div",
        ref: (element) => {
            stop?.();
            stop = observeCarouselRow(element, setMetrics);
        },
        machine: () => api().getItemGroupProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** An item's place in the row: as wide as a large item. Its mask goes in it. */
function Item(props: CarouselItemProps): JSX.Element {
    const { scope, api, size, initial, setAspectRatio } = context.use("Item");
    const index = () => props.index;
    createEffect(
        () => [props.index, props.aspectRatio] as const,
        ([at, ratio]) => {
            setAspectRatio(at, ratio);
        },
    );
    return (
        <itemContext.Provider value={{ index }}>
            {scope.render("item", {
                element: "div",
                machine: () => {
                    const item = api().getItemProps({ index: props.index });
                    const slot = size(props.index)?.slot;
                    return {
                        ...item,
                        style: {
                            ...(item.style as object),
                            width: slot === undefined ? initial() : px(slot),
                        },
                    };
                },
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", "index", "aspectRatio"),
            })}
        </itemContext.Provider>
    );
}

/** The rounded item people see: it takes focus (the arrow keys move between items) and presses.
 *  Its content goes in it. */
function Mask(props: CarouselMaskProps): JSX.Element {
    const { scope, api, sources, size, initial } = context.use("Mask");
    const { index } = itemContext.use("Mask");
    const source = sources.item(
        () => String(index()),
        () => props.interactionSource,
    );
    return scope.render("mask", {
        element: "div",
        interactionSource: source,
        machine: () => {
            const mask = api().getMaskProps({
                index: index(),
                disabled: props.disabled,
            });
            const sized = size(index());
            return {
                ...mask,
                style: {
                    width: sized ? px(sized.mask) : initial(),
                    "margin-inline-start": sized ? px(sized.offset) : undefined,
                },
            };
        },
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "disabled", "interactionSource"),
    });
}

/** What an item shows, at the item's full size, centered in its mask. */
function Content(props: CarouselPartProps): JSX.Element {
    const { scope, api, size, initial } = context.use("Content");
    const { index } = itemContext.use("Content");
    return scope.render("content", {
        element: "div",
        machine: () => {
            const slot = size(index())?.slot;
            return {
                ...api().getContentProps({ index: index() }),
                style: { width: slot === undefined ? initial() : px(slot) },
            };
        },
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made carousel's props: Root's (without the item count, which the items give), with
 *  `class`, `style`, `slotProps` and `unstyled` keyed by part (an item's parts also by item,
 *  `CarouselItemInstance`), and the items as data. */
export interface CarouselProps
    extends
        Omit<
            CarouselRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "slideCount"
        >,
        SlotKeyedProps<Anatomy, never, CarouselInstances<JSX.Element>>,
        CarouselContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...CAROUSEL_CONTENT_PROPS,
] as const;

/** The ready-made carousel: the row with an item per entry of `items`, each a mask around its
 *  content. */
function ReadyMade(props: CarouselProps): JSX.Element {
    const items = createMemo(() => props.items ?? []);
    const slots = createSlotProps<
        Anatomy,
        never,
        CarouselInstances<JSX.Element>
    >(props);
    const own = omit(props, ...READY_MADE_PROPS) as Omit<
        CarouselRootProps,
        "slideCount"
    >;
    const root = slots("root") as object;
    const itemGroup = slots("itemGroup");
    return (
        <Root {...own} slideCount={items().length} {...root}>
            <ItemGroup {...itemGroup}>
                <For each={items()} keyed={false}>
                    {(entry: Accessor<CarouselItem<JSX.Element>>, index) => {
                        const item = (): CarouselItemInstance<JSX.Element> => ({
                            index,
                            item: entry(),
                        });
                        return (
                            <Item
                                index={index}
                                aspectRatio={entry().aspectRatio}
                                {...slots("item", item)}
                            >
                                <Mask
                                    aria-label={entry()["aria-label"]}
                                    disabled={entry().disabled}
                                    interactionSource={
                                        entry().interactionSource
                                    }
                                    {...slots("mask", item)}
                                >
                                    <Content {...slots("content", item)}>
                                        {entry().content}
                                    </Content>
                                </Mask>
                            </Item>
                        );
                    }}
                </For>
            </ItemGroup>
        </Root>
    );
}

/** Material's carousel. Use it ready-made, `<Carousel aria-label="Trips" items={[{ content: <img
 *  … />, "aria-label": "Lisbon" }, …]} />`, or compose its parts under `Carousel.Root` (with
 *  `slideCount`): `ItemGroup` holding an `Item` per item (with its `index`), each with a `Mask`
 *  around its `Content`. */
export const Carousel = Object.assign(ReadyMade, {
    Root,
    ItemGroup,
    Item,
    Mask,
    Content,
});

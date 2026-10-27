// The carousel: Root on the carousel machine (Zag's), the scrolling row of items, each item's mask
// (the rounded item people see, which takes focus and presses) and its content, and the
// ready-made Carousel over them. The row is measured as it scrolls and resizes, and each item is
// sized from the layout: its slot and content keep the large size, while its mask's width and
// offset follow the scroll, so the content stays put as the mask around it shrinks.

import { carouselAnatomy } from "@pureform/anatomy";
import {
    CAROUSEL_ROOT_PROPS,
    carouselItemSizes,
    carouselSelection,
} from "@pureform/binding-core";
import type {
    CarouselContentProps,
    CarouselInstances,
    CarouselItemInstance,
    CarouselItemSize,
    CarouselMetrics,
    CarouselRootOwnProps,
    InteractionSourceProps,
} from "@pureform/binding-core";
import { carouselInitialStyle } from "@pureform/binding-web";
import { carouselMachineProps } from "@pureform/binding-web";
import { carouselRowPadding, observeCarouselRow } from "@pureform/binding-web";
import * as carousel from "@pureform/machines/carousel";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type CSSProperties,
    type ElementType,
    type ReactNode,
    useCallback,
    useId,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { useReducedMotion } from "../motion";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useComponentState, useDirection } from "../provider";

type Anatomy = typeof carouselAnatomy;

/** What Root shares with its parts. */
interface CarouselContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: carousel.Api<PropTypes>;
    readonly sources: ItemInteractionSources;
    /** An item's sizes, once the row is measured. */
    readonly size: (index: number) => CarouselItemSize | undefined;
    /** Its size before then. */
    readonly initial: string | undefined;
    readonly setMetrics: (metrics: CarouselMetrics) => void;
    readonly setAspectRatio: (index: number, ratio: number | undefined) => void;
}

/** What an item shares with its parts. */
interface ItemContextValue {
    readonly index: number;
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
    readonly as?: ElementType | undefined;
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

const withStyle = <P extends object>(props: P, style: CSSProperties): P => ({
    ...props,
    style: { ...(props as { style?: CSSProperties }).style, ...style },
});

/** The carousel's root, a `<div>` region around the row. */
function Root(props: CarouselRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const reducedMotion = useReducedMotion();
    const page = useControllable<"page", number>("Carousel", "page", props);
    const sources = useItemInteractionSources();
    const { registry } = useComponentState();
    const service = useMachine(carousel.machine, {
        id,
        ...sources.machineProps,
        dir,
        slideCount: props.slideCount,
        padding: carouselRowPadding(registry),
        reducedMotion,
        ...carouselMachineProps(props),
        ...page.machineProps,
    });
    const api = carousel.connect(service, normalizeProps);
    const scope = useComponent(carouselAnatomy, {
        selection: carouselSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const [metrics, setMetrics] = useState<CarouselMetrics>();
    const [ratios, setRatios] = useState<
        Readonly<Record<number, number | undefined>>
    >({});
    const { layout, itemWidth, slideCount } = props;
    const sizes = useMemo(
        () =>
            metrics &&
            carouselItemSizes(
                {
                    layout,
                    count: slideCount,
                    itemWidth,
                    aspectRatios: Array.from(
                        { length: slideCount },
                        (_, index) => ratios[index],
                    ),
                },
                metrics,
            ),
        [metrics, ratios, layout, itemWidth, slideCount],
    );
    const setAspectRatio = useCallback(
        (index: number, ratio: number | undefined) =>
            setRatios((all) =>
                all[index] === ratio ? all : { ...all, [index]: ratio },
            ),
        [],
    );
    const {
        as,
        slideCount: _count,
        ...rest
    } = omitProps(props, CAROUSEL_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                api,
                sources,
                size: (index) => sizes?.[index],
                initial: carouselInitialStyle(layout, itemWidth),
                setMetrics,
                setAspectRatio,
            }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The row of items, which scrolls and snaps to each. */
function ItemGroup({ unstyled, ...props }: CarouselPartProps): ReactNode {
    const { scope, api, setMetrics } = context.use("ItemGroup");
    // oxlint-disable-next-line react/preserve-manual-memoization -- the package isn't built with React Compiler; this callback ref is memoized by hand
    const ref = useCallback(
        (element: HTMLElement | null) =>
            element ? observeCarouselRow(element, setMetrics) : undefined,
        // oxlint-disable-next-line react/preserve-manual-memoization -- the package isn't built with React Compiler; this callback ref is memoized by hand
        [setMetrics],
    );
    return scope.render("itemGroup", {
        element: "div",
        ref,
        machine: api.getItemGroupProps(),
        unstyled,
        props,
    });
}

/** An item's place in the row: as wide as a large item. Its mask goes in it. */
function Item({
    unstyled,
    index,
    aspectRatio,
    ...props
}: CarouselItemProps): ReactNode {
    const { scope, api, size, initial, setAspectRatio } = context.use("Item");
    useLayoutEffect(() => {
        setAspectRatio(index, aspectRatio);
    }, [index, aspectRatio, setAspectRatio]);
    const slot = size(index)?.slot;
    return (
        <itemContext.Provider value={{ index }}>
            {scope.render("item", {
                element: "div",
                machine: withStyle(api.getItemProps({ index }), {
                    width: slot === undefined ? initial : px(slot),
                }),
                unstyled,
                props,
            })}
        </itemContext.Provider>
    );
}

/** The rounded item people see: it takes focus (the arrow keys move between items) and presses.
 *  Its content goes in it. */
function Mask({
    unstyled,
    disabled,
    interactionSource,
    ...props
}: CarouselMaskProps): ReactNode {
    const { scope, api, sources, size, initial } = context.use("Mask");
    const { index } = itemContext.use("Mask");
    const source = sources.item(String(index), interactionSource);
    const sized = size(index);
    return scope.render("mask", {
        element: "div",
        interactionSource: source,
        machine: withStyle(api.getMaskProps({ index, disabled }), {
            width: sized ? px(sized.mask) : initial,
            marginInlineStart: sized ? px(sized.offset) : undefined,
        }),
        unstyled,
        props,
    });
}

/** What an item shows, at the item's full size, centered in its mask. */
function Content({ unstyled, ...props }: CarouselPartProps): ReactNode {
    const { scope, api, size, initial } = context.use("Content");
    const { index } = itemContext.use("Content");
    const slot = size(index)?.slot;
    return scope.render("content", {
        element: "div",
        machine: withStyle(api.getContentProps({ index }), {
            width: slot === undefined ? initial : px(slot),
        }),
        unstyled,
        props,
    });
}

/** The ready-made carousel's props: Root's (without the item count, which the items give), with
 *  `className`, `style`, `slotProps` and `unstyled` keyed by part (an item's parts also by item,
 *  `CarouselItemInstance`), and the items as data. */
export interface CarouselProps
    extends
        Omit<
            CarouselRootProps,
            keyof SlotKeyedProps<Anatomy> | "children" | "slideCount"
        >,
        SlotKeyedProps<Anatomy, never, CarouselInstances<ReactNode>>,
        CarouselContentProps<ReactNode> {}

/** The ready-made carousel: the row with an item per entry of `items`, each a mask around its
 *  content. */
function ReadyMade(props: CarouselProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        items = [],
        ...rootProps
    } = props;
    const slot = useSlotProps<Anatomy, never, CarouselInstances<ReactNode>>(
        props,
    );
    const each = slot.each("item") || slot.each("mask") || slot.each("content");
    return (
        <Root
            {...rootProps}
            slideCount={items.length}
            {...(slot("root") as object)}
        >
            <ItemGroup {...slot("itemGroup")}>
                {items.map((entry, index) => {
                    const item: CarouselItemInstance<ReactNode> | undefined =
                        each ? { index, item: entry } : undefined;
                    return (
                        <Item
                            key={index}
                            index={index}
                            aspectRatio={entry.aspectRatio}
                            {...slot("item", item)}
                        >
                            <Mask
                                aria-label={entry["aria-label"]}
                                disabled={entry.disabled}
                                interactionSource={entry.interactionSource}
                                {...slot("mask", item)}
                            >
                                <Content {...slot("content", item)}>
                                    {entry.content}
                                </Content>
                            </Mask>
                        </Item>
                    );
                })}
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

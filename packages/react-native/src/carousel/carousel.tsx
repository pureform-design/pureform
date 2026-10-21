// The carousel: a horizontal `ScrollView` of items, each a pressable mask (the rounded item people
// see) around its content. The row's layout and scroll size each item as on the web: its slot and
// content keep the large size, and its mask's width and offset follow the scroll, so the content
// stays put as the mask around it shrinks. The row snaps to each item's start; `page` scrolls it,
// at once under reduced motion.

import { carouselAnatomy } from "@pureform/anatomy";
import type { IndicationAnatomy, TestIdOverride } from "@pureform/anatomy";
import {
    CAROUSEL_SIZES,
    carouselItemSizes,
    carouselSelection,
} from "@pureform/binding-core";
import type {
    CarouselItem,
    CarouselItemSize,
    CarouselMetrics,
    CarouselPart,
    CarouselVariantProps,
    ChangeDetails,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import { useReducedMotion } from "@pureform/rn-adapter/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import type {
    ScrollViewInstance,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from "react-native";

import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";
import type { ComponentSlots } from "../styles";

const MASK_INDICATION = carouselAnatomy.indication![0] as IndicationAnatomy;

export interface CarouselProps extends CarouselVariantProps {
    /** The items, in order. */
    readonly items: readonly CarouselItem<ReactNode>[];
    /** Its name, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    /** A large item's width. @default 186 */
    readonly itemWidth?: number | undefined;
    /** The item the row is snapped to. */
    readonly page?: number | undefined;
    readonly defaultPage?: number | undefined;
    readonly onPageChange?:
        | ((details: ChangeDetails<"page", number>) => void)
        | undefined;
    /** Called when an item is pressed, with its index. */
    readonly onItemPress?: ((index: number) => void) | undefined;
    readonly indication?: Indication | undefined;
    readonly testId?: TestIdOverride<CarouselPart> | undefined;
}

const number = (value: unknown): number =>
    typeof value === "number" ? value : 0;

interface ItemProps {
    readonly item: CarouselItem<ReactNode>;
    readonly index: number;
    readonly size: CarouselItemSize;
    readonly selection: Record<string, unknown>;
    readonly indication: Indication | undefined;
    readonly onPress: ((index: number) => void) | undefined;
    readonly testId: TestIdOverride<CarouselPart> | undefined;
}

function ItemImpl({
    item,
    index,
    size,
    selection,
    indication: given,
    onPress,
    testId,
}: ItemProps): ReactNode {
    const indication = useSurfaceIndication(MASK_INDICATION, {
        indication: given,
        interactionSource: item.interactionSource,
        disabled: item.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    }: ComponentSlots<CarouselPart> = useComponentSlots<CarouselPart>(
        "carousel",
        indication.select(selection),
        indication.states(item.disabled ? { disabled: true } : {}),
    );
    const id = (part: CarouselPart) => testIdOf(carouselAnatomy, part, testId);
    return (
        <v.item.View
            style={{ ...s.item, width: size.slot }}
            testID={id("item")}
        >
            <v.mask.Pressable
                {...indication.handlers}
                role="button"
                {...(item["aria-label"] === undefined
                    ? {}
                    : { "aria-label": item["aria-label"] })}
                disabled={item.disabled}
                {...(onPress ? { onPress: () => onPress(index) } : {})}
                style={{
                    ...s.mask,
                    ...unselectable,
                    width: size.mask,
                    marginStart: size.offset,
                }}
                testID={id("mask")}
            >
                <v.content.View
                    style={{ ...s.content, width: size.slot }}
                    testID={id("content")}
                >
                    {item.content}
                </v.content.View>
                {indication.layer(selected)}
            </v.mask.Pressable>
        </v.item.View>
    );
}

const Item = withEngine(ItemImpl, "CarouselItem");

function CarouselImpl(props: CarouselProps): ReactNode {
    const selection = carouselSelection(props);
    const { styles: s, views: v } = useComponentSlots<CarouselPart>(
        "carousel",
        selection,
    );
    const reducedMotion = useReducedMotion();
    const [page, setPage] = useControllable(
        "Carousel",
        "page",
        props.page,
        props.defaultPage,
        props.onPageChange,
        0,
    );
    const [box, setBox] = useState<{ width: number; height: number }>();
    const [scroll, setScroll] = useState(0);
    const row = useRef<ScrollViewInstance>(null);
    const id = (part: CarouselPart) =>
        testIdOf(carouselAnatomy, part, props.testId);
    const {
        gap: rawGap,
        paddingStart,
        paddingEnd,
        paddingLeft,
        paddingRight,
        alignItems,
        ...rowStyle
    } = s.itemGroup as Record<string, unknown>;
    const gap = number(rawGap);
    const padding = {
        start: number(paddingStart ?? paddingLeft),
        end: number(paddingEnd ?? paddingRight),
    };
    const itemWidth = props.itemWidth ?? CAROUSEL_SIZES.itemWidth;
    const metrics: CarouselMetrics | undefined = box && {
        viewport: Math.max(box.width - padding.start - padding.end, 0),
        height: box.height,
        gap,
        scroll,
    };
    const sizes = useMemo(
        () =>
            carouselItemSizes(
                {
                    layout: props.layout,
                    count: props.items.length,
                    itemWidth,
                    aspectRatios: props.items.map((item) => item.aspectRatio),
                },
                metrics ?? {
                    viewport: itemWidth,
                    height: 0,
                    gap,
                    scroll: 0,
                },
            ),
        [
            props.layout,
            props.items,
            itemWidth,
            gap,
            metrics?.viewport,
            metrics?.height,
            metrics?.scroll,
        ],
    );
    // Where each item's slot starts along the row: the offsets it snaps to.
    const offsets = useMemo(() => {
        let at = 0;
        return sizes.map((size) => {
            const start = at;
            at += size.slot + gap;
            return start;
        });
    }, [sizes, gap]);
    const pageOf = (x: number) =>
        offsets.reduce(
            (closest, offset, index) =>
                Math.abs(offset - x) < Math.abs(offsets[closest]! - x)
                    ? index
                    : closest,
            0,
        );
    // Scroll to the page when it changes from outside the row.
    const shown = useRef(page);
    useEffect(() => {
        if (shown.current === page) return;
        shown.current = page;
        row.current?.scrollTo({
            x: offsets[page] ?? 0,
            animated: !reducedMotion,
        });
    }, [page, offsets, reducedMotion]);
    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
        setScroll(Math.abs(event.nativeEvent.contentOffset.x));
    const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const next = pageOf(Math.abs(event.nativeEvent.contentOffset.x));
        shown.current = next;
        if (next !== page) setPage(next);
    };
    return (
        <v.root.View
            role="region"
            aria-roledescription="carousel"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={s.root}
            testID={id("root")}
        >
            <ScrollView
                ref={row}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToOffsets={offsets}
                decelerationRate="fast"
                scrollEventThrottle={16}
                onScroll={onScroll}
                onMomentumScrollEnd={onSettle}
                onScrollEndDrag={onSettle}
                onLayout={(event: LayoutChangeEvent) =>
                    setBox({
                        width: event.nativeEvent.layout.width,
                        height: event.nativeEvent.layout.height,
                    })
                }
                style={rowStyle}
                contentContainerStyle={{
                    flexDirection: "row",
                    gap,
                    paddingStart: padding.start,
                    paddingEnd: padding.end,
                    ...(alignItems === undefined
                        ? {}
                        : { alignItems: alignItems as "stretch" }),
                }}
                testID={id("itemGroup")}
            >
                {props.items.map((item, index) => (
                    <Item
                        key={index}
                        item={item}
                        index={index}
                        size={sizes[index]!}
                        selection={selection}
                        indication={props.indication}
                        onPress={props.onItemPress}
                        testId={props.testId}
                    />
                ))}
            </ScrollView>
        </v.root.View>
    );
}

/** Material's carousel: `<Carousel aria-label="Trips" items={[{ content: <Image … />,
 *  "aria-label": "Lisbon" }, …]} />`, `layout` `multiBrowse` (the default), `hero`,
 *  `uncontained`, `multiAspect` or `fullScreen`. */
export const Carousel = withEngine(CarouselImpl, "Carousel");

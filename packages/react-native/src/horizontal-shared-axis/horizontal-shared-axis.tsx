// The horizontal shared axis: a view around the page `index` names. When `index` changes, the
// page shown before slides a fifth of the width and fades out the way the change goes while the
// new one slides and fades in: the slide on the instance's `slideSpring` (the theme's
// `spatialDefault` spring), the fades linear over its `fadeDuration` after its `fadeDelay` (90ms
// after 50ms, Compose's `MaterialTransitions.HorizontalSharedAxis`). The
// outgoing page stays, hidden from assistive technology, until both end. Right to left mirrors
// the slide; reduced motion keeps the fades. Animated runs it on every engine.

import { horizontalSharedAxisAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    horizontalSharedAxisSelection,
    pagesMoving,
    SHARED_AXIS_FADE,
    SHARED_AXIS_SLIDE_FRACTION,
    sharedAxisChange,
} from "@pureform/binding-core";
import type {
    HorizontalSharedAxisPart,
    HorizontalSharedAxisVariantProps,
    PageKey,
    SharedAxisDirection,
    TransitionPage,
} from "@pureform/binding-core";
import {
    animate,
    NATIVE_DRIVER,
    slowSpring,
} from "@pureform/rn-adapter/animated";
import type { AnimatedTiming, Spring } from "@pureform/rn-adapter/animated";
import { LINEAR } from "@pureform/rn-adapter/factory";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { Animated } from "react-native";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";

import { useTransitionPages } from "../page-transition";
import { testIdOf } from "../parts";
import { themeSpring } from "../presence";
import { useDirection, usePureform } from "../provider";
import { useNativeSlotReader } from "../slot-props";
import type { NativeSlotProps, PartSlots } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface HorizontalSharedAxisHosts {
    readonly root: "View";
    readonly page: "View";
    readonly scrim: "View";
}

export interface HorizontalSharedAxisProps
    extends
        HorizontalSharedAxisVariantProps,
        NativeSlotProps<HorizontalSharedAxisHosts> {
    /** The page's place in the order: a change to a higher index slides forward, to a lower one
     *  backward. A change of `index` is a change of page. */
    readonly index: number;
    /** Veil the page underneath while a change runs, in the theme's scrim color. @default false */
    readonly scrim?: boolean | undefined;
    /** The page `index` names; a leaving page keeps what it showed last. */
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<HorizontalSharedAxisPart> | undefined;
}

// The root clips the pages only while they move, so focus rings and shadows show at rest.
const CLIP: ViewStyle = { overflow: "hidden" };

const FILL: ViewStyle = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
};

interface Motion {
    readonly slide: AnimatedTiming | undefined;
    readonly fade: AnimatedTiming;
    readonly width: number;
    readonly rtl: boolean;
}

// Where a page sits, as a share of the width, at the start (entering) or end (leaving) of its
// move: forward, it enters from the end and leaves to the start.
const offsetOf = (page: TransitionPage, rtl: boolean): number => {
    const towardEnd =
        (page.state === "entering") === (page.direction === "forward");
    return (towardEnd !== rtl ? 1 : -1) * SHARED_AXIS_SLIDE_FRACTION;
};

function Page(props: {
    readonly page: TransitionPage;
    readonly motion: Motion;
    readonly style: StyleProp<ViewStyle>;
    readonly slot: PartSlots;
    readonly testID: string | undefined;
    readonly onSettle: (page: TransitionPage) => void;
    readonly children: ReactNode;
}): ReactNode {
    const { page, motion, onSettle } = props;
    // 0 at the move's start, 1 at its end.
    const [slide] = useState(() => new Animated.Value(1));
    const [fade] = useState(() => new Animated.Value(1));
    const moving = page.state !== "current";
    useLayoutEffect(() => {
        if (!moving) {
            slide.setValue(1);
            fade.setValue(1);
            return;
        }
        slide.setValue(0);
        fade.setValue(0);
        const run = Animated.parallel([
            ...(motion.slide
                ? [animate(slide, motion.slide, NATIVE_DRIVER)]
                : [
                      Animated.timing(slide, {
                          toValue: 1,
                          duration: 0,
                          useNativeDriver: NATIVE_DRIVER,
                      }),
                  ]),
            animate(fade, motion.fade, NATIVE_DRIVER),
        ]);
        run.start(({ finished }) => {
            if (finished) onSettle(page);
        });
        return () => run.stop();
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs as the page (or direction) changes; the motion is read as it runs
    }, [page]);
    const offset = moving ? offsetOf(page, motion.rtl) * motion.width : 0;
    const entering = page.state === "entering";
    const leaving = page.state === "leaving";
    const style: ViewStyle[] = [];
    if (leaving) style.push(FILL);
    if (moving) {
        // Forward, the incoming page draws over the outgoing; backward, under it.
        style.push({
            zIndex: entering === (page.direction === "forward") ? 2 : 0,
        });
    }
    return (
        <Animated.View
            {...props.slot.props("page")}
            style={[
                props.style,
                ...style,
                moving
                    ? {
                          opacity: fade.interpolate({
                              inputRange: [0, 1],
                              outputRange: entering ? [0, 1] : [1, 0],
                          }),
                          transform: [
                              {
                                  translateX: motion.slide
                                      ? slide.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: entering
                                                ? [offset, 0]
                                                : [0, offset],
                                        })
                                      : 0,
                              },
                          ],
                      }
                    : null,
            ]}
            testID={props.testID}
            {...(leaving
                ? {
                      "aria-hidden": true,
                      importantForAccessibility: "no-hide-descendants" as const,
                      pointerEvents: "none" as const,
                  }
                : {})}
            data-state={page.state}
            data-direction={page.direction}
        >
            {props.children}
        </Animated.View>
    );
}

function Scrim(props: {
    readonly direction: SharedAxisDirection;
    readonly timing: AnimatedTiming | undefined;
    readonly style: StyleProp<ViewStyle>;
    readonly slot: PartSlots;
    readonly testID: string | undefined;
}): ReactNode {
    const [shown] = useState(() => new Animated.Value(0));
    useLayoutEffect(() => {
        shown.setValue(0);
        const run = props.timing
            ? animate(shown, props.timing, NATIVE_DRIVER)
            : undefined;
        if (run) run.start();
        else shown.setValue(1);
        return () => run?.stop();
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs as the page (or direction) changes; the motion is read as it runs
    }, [props.direction]);
    return (
        <Animated.View
            {...props.slot.props("scrim")}
            aria-hidden
            pointerEvents="none"
            style={[
                props.style,
                FILL,
                {
                    zIndex: 1,
                    opacity: shown.interpolate({
                        inputRange: [0, 1],
                        outputRange:
                            props.direction === "forward" ? [0, 1] : [1, 0],
                    }),
                },
            ]}
            testID={props.testID}
            data-direction={props.direction}
        />
    );
}

const change = (pages: readonly TransitionPage[], key: PageKey) =>
    sharedAxisChange(pages, Number(key));

// A duration token in ms: a number, or a CSS time (`120ms`, `0.12s`); else the default.
const msOf = (value: unknown, fallback: number): number => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return fallback;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return fallback;
    return value.trim().endsWith("ms") || !value.trim().endsWith("s")
        ? n
        : n * 1000;
};

// The slide's spring: a role the theme names, or a spring of its own; the theme's
// `spatialDefault` without one.
const springOf = (
    value: unknown,
    tokens: Parameters<typeof themeSpring>[1],
    timeScale: number,
): Spring | undefined => {
    if (typeof value === "string") return themeSpring(value, tokens, timeScale);
    if (value && typeof value === "object" && "stiffness" in value)
        return slowSpring(value as Spring, timeScale);
    return themeSpring("spatialDefault", tokens, timeScale);
};

/** Material's horizontal shared axis, for spatially related pages (tabs, steps, onboarding):
 *  `<HorizontalSharedAxis index={step}>{pages[step]}</HorizontalSharedAxis>`. A higher `index`
 *  slides forward, a lower one backward; `scrim` veils the page underneath while they move. */
export function HorizontalSharedAxis(
    props: HorizontalSharedAxisProps,
): ReactNode {
    const nativeSlots = useNativeSlotReader("horizontalSharedAxis");
    const { styles: s, views: v } = useComponentSlots<HorizontalSharedAxisPart>(
        "horizontalSharedAxis",
        horizontalSharedAxisSelection(props),
    );
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale, defaults } = usePureform();
    const rtl = useDirection() === "rtl";
    const [width, setWidth] = useState(0);
    const {
        pages: changed,
        contents,
        settle: onSettle,
    } = useTransitionPages(props.index, props.children, change);
    // The instance's tokens, over the provider's defaults, as the web's vars would be.
    const own = {
        ...(defaults.horizontalSharedAxis as HorizontalSharedAxisVariantProps)
            ?.tokens,
        ...props.tokens,
    };
    const spring = reducedMotion
        ? undefined
        : springOf(own.slideSpring, tokens, timeScale);
    const slide: AnimatedTiming | undefined = spring
        ? { duration: 0, easing: LINEAR, spring }
        : undefined;
    const motion: Motion = {
        slide,
        fade: {
            duration:
                msOf(own.fadeDuration, SHARED_AXIS_FADE.duration) * timeScale,
            delay: msOf(own.fadeDelay, SHARED_AXIS_FADE.delay) * timeScale,
            easing: LINEAR,
        },
        width,
        rtl,
    };
    const id = (part: HorizontalSharedAxisPart) =>
        testIdOf(horizontalSharedAxisAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const entering = changed.find((page) => page.state === "entering");
    const leaving = changed.some((page) => page.state === "leaving");
    const Root = v.root.View;
    return (
        <Root
            {...slot.props("root")}
            style={[
                slot.style("root", s.root),
                pagesMoving(changed) ? CLIP : null,
            ]}
            testID={id("root")}
            onLayout={(event: LayoutChangeEvent) =>
                setWidth(event.nativeEvent.layout.width)
            }
        >
            {changed.map((page) => (
                <Page
                    key={page.key}
                    page={page}
                    motion={motion}
                    style={slot.style("page", s.page) as StyleProp<ViewStyle>}
                    slot={slot}
                    testID={id("page")}
                    onSettle={onSettle}
                >
                    {contents.get(page.key)}
                </Page>
            ))}
            {props.scrim && leaving && entering?.direction ? (
                <Scrim
                    direction={entering.direction}
                    timing={slide}
                    style={slot.style("scrim", s.scrim) as StyleProp<ViewStyle>}
                    slot={slot}
                    testID={id("scrim")}
                />
            ) : null}
        </Root>
    );
}

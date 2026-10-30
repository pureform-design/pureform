// The progress indicators: linear (a track, its indicator and a stop dot) and circular (a track,
// then two halves, each clipping an arc). Without a value they're indeterminate. The value is the instance's `value`
// token, a percentage of the way from `min` to `max`, which moves over its transition.

import {
    circularProgressAnatomy,
    linearProgressAnatomy,
} from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { progressSelection } from "@pureform/binding-core";
import type {
    CircularProgressPart,
    LinearProgressPart,
    ProgressReadyMadeProps,
    ProgressValueProps,
    ProgressVariantProps,
} from "@pureform/binding-core";
import { useMotionTimeline } from "@pureform/rn-adapter/animated";
import { useReducedMotion } from "@pureform/rn-adapter/react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LayoutChangeEvent, ViewProps } from "react-native";

import type { MotionEngine } from "./engine";
import { testIdOf, withEngine } from "./parts";
import { useEngine, useDirection } from "./provider";
import { useNativeSlotReader } from "./slot-props";
import type { NativeSlotProps } from "./slot-props";
import { useComponentSlots } from "./styles";

// Native selections keep percentage lengths until the component has measured its frame.
const lengthAt = (value: unknown, width: number): number => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;
    if (value.endsWith("%")) return (width * Number.parseFloat(value)) / 100;
    return value.endsWith("px") ? Number.parseFloat(value) : 0;
};

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface LinearProgressHosts {
    readonly root: "View";
    readonly track: "View";
    readonly trackBefore: "View";
    readonly trackAfter: "View";
    readonly indicator: "View";
    readonly stopIndicator: "View";
}

export interface LinearProgressProps
    extends
        ProgressVariantProps<"linearProgress">,
        ProgressValueProps,
        ProgressReadyMadeProps,
        NativeSlotProps<LinearProgressHosts> {
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<LinearProgressPart> | undefined;
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface CircularProgressHosts {
    readonly root: "View";
    readonly track: "View";
    readonly trackEndHalf: "View";
    readonly trackEndArc: "View";
    readonly trackStartHalf: "View";
    readonly trackStartArc: "View";
    readonly trackTailCap: "View";
    readonly trackHeadCap: "View";
    readonly endHalf: "View";
    readonly endArc: "View";
    readonly startHalf: "View";
    readonly startArc: "View";
    readonly tailCap: "View";
    readonly headCap: "View";
}

export interface CircularProgressProps
    extends
        ProgressVariantProps<"circularProgress">,
        ProgressValueProps,
        ProgressReadyMadeProps,
        NativeSlotProps<CircularProgressHosts> {
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<CircularProgressPart> | undefined;
}

const valueProps = (
    props: ProgressValueProps & { readonly "aria-label"?: string | undefined },
) => ({
    role: "progressbar" as const,
    ...(props.value == null ? {} : { "aria-valuenow": props.value }),
    "aria-valuemin": props.min ?? 0,
    "aria-valuemax": props.max ?? 100,
    ...(props["aria-label"] === undefined
        ? {}
        : { "aria-label": props["aria-label"] }),
});

function LinearProgressImpl(props: LinearProgressProps): ReactNode {
    const nativeSlots = useNativeSlotReader("linearProgress");
    const engine = useEngine();
    const rtl = useDirection() === "rtl";
    const reduced = useReducedMotion();
    const [width, setWidth] = useState(0);
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<LinearProgressPart>(
        "linearProgress",
        progressSelection(props) as Record<string, unknown>,
        {},
        undefined,
        { keyframes: false },
    );
    const id = (part: LinearProgressPart) =>
        testIdOf(linearProgressAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const sliding = selected.animations.indicator;
    const waving = selected.animations.root;
    const indeterminate = !!sliding;
    const wavy = !!selected.drawings.indicator?.shape;
    const pixels = lengthAt(selected.styles.indicator?.width, width);
    const inset = lengthAt(selected.styles.indicator?.start, width);
    const sign = rtl ? -1 : 1;
    const trackStyle = (part: "trackBefore" | "trackAfter") => {
        const style = selected.styles[part];
        const start =
            lengthAt(style?.start, width) + lengthAt(style?.marginStart, width);
        return {
            ...s[part],
            ...(indeterminate
                ? {
                      start: undefined,
                      end: undefined,
                      marginStart: 0,
                      marginEnd: 0,
                      left: rtl
                          ? width - lengthAt(style?.width, width) - start
                          : start,
                      transform: [{ translateX: motion.slide }],
                  }
                : {}),
        };
    };
    const useTimeline: NonNullable<MotionEngine["useTimeline"]> =
        engine.useTimeline ?? useMotionTimeline;
    const timeline = useTimeline({
        slide: {
            duration: sliding?.duration ?? 0,
            easing: sliding?.easing ?? {
                type: "easing",
                kind: "keyword",
                name: "linear",
            },
            enabled: indeterminate && width > 0,
        },
        wave: {
            duration: waving?.duration ?? 0,
            easing: waving?.easing ?? {
                type: "easing",
                kind: "keyword",
                name: "linear",
            },
            enabled: wavy && !reduced && width > 0,
        },
    });
    // oxlint-disable-next-line react/preserve-manual-memoization -- retain native graph nodes until geometry changes; the timeline owns mutable driver values, not React state
    const motion = useMemo(() => {
        const from = -sign * pixels;
        const to = sign * 2.5 * pixels;
        return {
            slide: timeline.value({ terms: [{ clock: "slide", from, to }] }),
            // The wave cancels the window's slide, then travels on its own linear clock.
            wave: timeline.value({
                terms: [
                    ...(indeterminate
                        ? [{ clock: "slide", from: -from, to: -to }]
                        : []),
                    { clock: "wave", from: 0, to: sign * 40 },
                ],
            }),
        };
    }, [timeline, sign, pixels, indeterminate]);
    const MotionView = timeline.View;
    const Indicator = indeterminate ? MotionView : v.indicator.View;
    const rootProps = slot.props("root") as ViewProps;
    const layout = (event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
        rootProps.onLayout?.(event);
    };
    return (
        <v.root.View
            {...rootProps}
            onLayout={layout}
            {...valueProps(props)}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {props.track === false ? null : (
                <v.track.View
                    {...slot.props("track")}
                    style={slot.style("track", s.track)}
                    testID={id("track")}
                >
                    <MotionView
                        {...slot.props("trackBefore")}
                        style={slot.style(
                            "trackBefore",
                            trackStyle("trackBefore"),
                        )}
                        testID={id("trackBefore")}
                    />
                    <MotionView
                        {...slot.props("trackAfter")}
                        style={slot.style(
                            "trackAfter",
                            trackStyle("trackAfter"),
                        )}
                        testID={id("trackAfter")}
                    />
                </v.track.View>
            )}
            <Indicator
                {...slot.props("indicator")}
                style={slot.style("indicator", {
                    ...s.indicator,
                    start: undefined,
                    end: undefined,
                    left: rtl ? undefined : inset,
                    right: rtl ? inset : undefined,
                    ...(indeterminate
                        ? { transform: [{ translateX: motion.slide }] }
                        : {}),
                    ...(wavy ? { overflow: "hidden" } : {}),
                })}
                testID={id("indicator")}
            >
                {/* A wavy indicator is drawn in its wave with an SVG engine. */}
                {engine.Drawing && wavy ? (
                    <MotionView
                        style={{
                            position: "absolute",
                            top: 0,
                            ...(rtl
                                ? { right: -40 - inset }
                                : { left: -40 - inset }),
                            width: width + 40,
                            height: "100%",
                            transform: [
                                { translateX: motion.wave },
                                { scaleX: sign },
                            ],
                        }}
                    >
                        <engine.Drawing drawing={selected.drawings.indicator} />
                    </MotionView>
                ) : null}
            </Indicator>
            {props.track === false ? null : (
                <v.stopIndicator.View
                    {...slot.props("stopIndicator")}
                    style={slot.style("stopIndicator", s.stopIndicator)}
                    testID={id("stopIndicator")}
                />
            )}
        </v.root.View>
    );
}

/** Material's linear progress indicator: `<LinearProgress value={40} />`, indeterminate
 *  without a value. */
export const LinearProgress = withEngine(LinearProgressImpl, "LinearProgress");

function CircularProgressImpl(props: CircularProgressProps): ReactNode {
    const nativeSlots = useNativeSlotReader("circularProgress");
    const engine = useEngine();
    const {
        styles: s,
        views: v,
        selected,
    } = useComponentSlots<CircularProgressPart>(
        "circularProgress",
        progressSelection(props) as Record<string, unknown>,
    );
    const id = (part: CircularProgressPart) =>
        testIdOf(circularProgressAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    // SVG draws the band itself, rather than trying to mask a rotating native border View.
    // Keep the arc hosts (IDs/props) and their color customization in both rendering paths.
    const half = (
        part: "endHalf" | "startHalf",
        arc: "endArc" | "startArc",
    ) => {
        const Half = v[part];
        const Arc = v[arc];
        const drawing = selected.drawings[part];
        const svg = engine.Drawing && drawing;
        const arcStyle = slot.style(
            arc,
            svg ? { ...s[arc], borderWidth: 0, transform: [] } : s[arc],
        );
        const color = slot.style(
            arc,
            selected.styles[arc] ?? {},
        ).borderTopColor;
        return (
            <Half.View
                {...slot.props(part)}
                style={slot.style(part, s[part])}
                testID={id(part)}
            >
                <Arc.View
                    {...slot.props(arc)}
                    style={arcStyle}
                    testID={id(arc)}
                >
                    {svg && engine.Drawing ? (
                        <engine.Drawing
                            drawing={{
                                ...drawing,
                                ...(typeof color === "string"
                                    ? { fill: color }
                                    : {}),
                            }}
                        />
                    ) : null}
                </Arc.View>
            </Half.View>
        );
    };
    return (
        <v.root.View
            {...slot.props("root")}
            {...valueProps(props)}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {props.track === false ? null : (
                <v.track.View
                    {...slot.props("track")}
                    style={slot.style("track", s.track)}
                    testID={id("track")}
                >
                    <v.trackEndHalf.View
                        {...slot.props("trackEndHalf")}
                        style={slot.style("trackEndHalf", s.trackEndHalf)}
                        testID={id("trackEndHalf")}
                    >
                        <v.trackEndArc.View
                            {...slot.props("trackEndArc")}
                            style={slot.style("trackEndArc", s.trackEndArc)}
                            testID={id("trackEndArc")}
                        />
                    </v.trackEndHalf.View>
                    <v.trackStartHalf.View
                        {...slot.props("trackStartHalf")}
                        style={slot.style("trackStartHalf", s.trackStartHalf)}
                        testID={id("trackStartHalf")}
                    >
                        <v.trackStartArc.View
                            {...slot.props("trackStartArc")}
                            style={slot.style("trackStartArc", s.trackStartArc)}
                            testID={id("trackStartArc")}
                        />
                    </v.trackStartHalf.View>
                    <v.trackTailCap.View
                        {...slot.props("trackTailCap")}
                        style={slot.style("trackTailCap", s.trackTailCap)}
                        testID={id("trackTailCap")}
                    />
                    <v.trackHeadCap.View
                        {...slot.props("trackHeadCap")}
                        style={slot.style("trackHeadCap", s.trackHeadCap)}
                        testID={id("trackHeadCap")}
                    />
                </v.track.View>
            )}
            {half("endHalf", "endArc")}
            {half("startHalf", "startArc")}
            <v.tailCap.View
                {...slot.props("tailCap")}
                style={slot.style("tailCap", s.tailCap)}
                testID={id("tailCap")}
            />
            <v.headCap.View
                {...slot.props("headCap")}
                style={slot.style("headCap", s.headCap)}
                testID={id("headCap")}
            />
        </v.root.View>
    );
}

/** Material's circular progress indicator: `<CircularProgress value={40} />`, indeterminate
 *  without a value. `shape="wavy"` draws a wave band with either SVG engine; non-SVG engines
 *  retain the border-arc fallback. Size, thickness, amplitude and colors follow the theme tokens. */
export const CircularProgress = withEngine(
    CircularProgressImpl,
    "CircularProgress",
);

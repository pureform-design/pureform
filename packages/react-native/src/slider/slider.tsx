// The slider: the inactive tracks either side of the active one, its stops, and per thumb a handle
// holding its state layer (where it ripples), and a value indicator, dragged by pointer or touch, which
// presses and drags it in its interaction source. A range has two thumbs; a centered slider's
// active track grows from the middle; `orientation: "vertical"` stands it up. The parts are placed
// by the instance's tokens (percentages of the range): the root's from the value, and each
// thumb's and stop's own, resolved for it.

import { sliderAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    sliderMarkerTokens,
    sliderInsetIconOverflows,
    sliderInsetIconMeasuresOfStyle,
    sliderSelection,
    sliderStopActive,
    sliderStops,
    sliderThumbTokens,
    sliderValues,
    sliderValueShape,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    InteractiveProps,
    SliderInsetIconMeasures,
    SliderPart,
    SliderValue,
    SliderVariantProps,
} from "@pureform/binding-core";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { Text } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { useComponentSlots } from "../styles";

const [INDICATION] = sliderAnatomy.indication!;

export interface SliderProps<V extends SliderValue = SliderValue>
    extends SliderVariantProps, InteractiveProps {
    /** The value, or a range's two. Controlled when defined. */
    readonly value?: V | undefined;
    readonly defaultValue?: V | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", V>) => void)
        | undefined;
    /** Default 0. */
    readonly min?: number | undefined;
    /** Default 100. */
    readonly max?: number | undefined;
    /** Default 1. */
    readonly step?: number | undefined;
    /** The active track runs from the middle of the range to the value. */
    readonly centered?: boolean | undefined;
    /** Stop indicators: one at every step (`true`), or at the given values. */
    readonly stops?: boolean | readonly number[] | undefined;
    /** Shows the value beside the handle while it's dragged. */
    readonly valueIndicator?: boolean | undefined;
    /** An icon inside the active track, at its start; drawn at sizes `medium` and up. */
    readonly insetIcon?: ReactNode;
    readonly disabled?: boolean | undefined;
    /** What the slider sets, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<SliderPart> | undefined;
}

// What the root is, read for where it sits: the DOM's rectangle on the web, `measure` on a
// device.
interface Measurable {
    getBoundingClientRect?: () => DOMRect;
    measure: (
        done: (
            x: number,
            y: number,
            width: number,
            height: number,
            left: number,
            top: number,
        ) => void,
    ) => void;
}

interface Track {
    readonly start: number;
    readonly length: number;
}

// What assistive technology can do to it.
const ADJUSTABLE = [{ name: "increment" }, { name: "decrement" }] as const;

const TEXT_KEYS = [
    "color",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "textAlign",
] as const;

// The text's own properties of a slot's style, for the value inside the value indicator.
const textOf = (style: object | undefined) => {
    const picked: Record<string, unknown> = {};
    for (const key of TEXT_KEYS) {
        const value = (style as Record<string, unknown> | undefined)?.[key];
        if (value !== undefined) picked[key] = value;
    }
    return picked;
};

type Slots = ReturnType<typeof useComponentSlots<SliderPart>>;
type State = Parameters<typeof useComponentSlots>[2];

/** A thumb: its state layer, handle, and value indicator, styled for its own place. */
function Thumb(props: {
    readonly selection: Record<string, unknown>;
    readonly state: State;
    readonly percent: number;
    readonly value: number;
    readonly showValue: boolean;
    readonly layer: ((selected: Slots["selected"]) => ReactNode) | undefined;
    readonly id: (part: SliderPart) => string | undefined;
}): ReactNode {
    const selection = props.selection as { tokens?: object };
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<SliderPart>(
        "slider",
        {
            ...selection,
            tokens: {
                ...selection.tokens,
                ...sliderThumbTokens(props.percent),
            },
        },
        props.state,
    );
    return (
        <>
            <v.handle.View
                pointerEvents="none"
                style={s.handle}
                testID={props.id("handle")}
            >
                <v.stateLayer.View
                    pointerEvents="none"
                    style={s.stateLayer}
                    testID={props.id("stateLayer")}
                >
                    {props.layer?.(selected)}
                </v.stateLayer.View>
            </v.handle.View>
            {props.showValue && (
                <v.valueIndicator.View
                    pointerEvents="none"
                    style={s.valueIndicator}
                    testID={props.id("valueIndicator")}
                >
                    <Text style={textOf(s.valueIndicator)}>{props.value}</Text>
                </v.valueIndicator.View>
            )}
        </>
    );
}

/** A stop, styled for its own place and whether it's on the active track. */
function Marker(props: {
    readonly selection: Record<string, unknown>;
    readonly state: State;
    readonly percent: number;
    readonly active: boolean;
    readonly testID: string | undefined;
}): ReactNode {
    const selection = props.selection as { tokens?: object };
    const { styles: s, views: v } = useComponentSlots<SliderPart>(
        "slider",
        {
            ...selection,
            tokens: {
                ...selection.tokens,
                ...sliderMarkerTokens(props.percent, props.active),
            },
        },
        props.state,
    );
    return (
        <v.marker.View
            pointerEvents="none"
            style={s.marker}
            testID={props.testID}
        />
    );
}

function SliderImpl(props: SliderProps): ReactNode {
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const step = props.step ?? 1;
    const vertical = props.orientation === "vertical";
    const given = props.value ?? props.defaultValue;
    const [value, setValue] = useControllable<"value", SliderValue>(
        "Slider",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange as
            | ((details: ChangeDetails<"value", SliderValue>) => void)
            | undefined,
        min,
    );
    const values = sliderValues(value) ?? [min];
    const set = (next: number[]) => setValue(sliderValueShape(next, given));
    // The thumb the keyboard and a drag move: the one nearest where a drag started.
    const [active, setActive] = useState(values.length - 1);
    // Where the track sits on the page, read when a drag starts; until then, none.
    const track = useRef<Track>(undefined);
    const root = useRef<Measurable>(null);
    const percentOf = (v: number) =>
        max > min
            ? ((Math.min(Math.max(v, min), max) - min) / (max - min)) * 100
            : 0;
    const percents = values.map(percentOf);
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
    });
    const { interaction } = indication;
    const selection = indication.select(sliderSelection(props, percents));
    // The root's length along the axis, for whether the inset icon fits in the active track.
    const [length, setLength] = useState(0);
    // The theme's `insetIconSize` and `insetIconPadding`, read from the icon's resolved style.
    const [measures, setMeasures] = useState<SliderInsetIconMeasures>();
    const overflowing =
        isPresent(props.insetIcon) &&
        sliderInsetIconOverflows(length, percents, props.centered, measures);
    const state = {
        ...indication.states(),
        ...(overflowing ? { overflowing: true } : {}),
        dragged: indication.state.dragged,
        ...(props.disabled ? { disabled: true } : {}),
    };
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<SliderPart>("slider", selection, state);
    const measured = sliderInsetIconMeasuresOfStyle(
        s.insetIcon as Record<string, unknown> | undefined,
        {
            vertical: props.orientation === "vertical",
            overflowing,
            percents,
            centered: props.centered,
        },
    );
    useEffect(() => {
        setMeasures((last) =>
            measured?.size === last?.size && measured?.padding === last?.padding
                ? last
                : measured,
        );
    }, [measured?.size, measured?.padding]);
    const rtl = useDirection() === "rtl";
    const snap = (raw: number) =>
        Math.min(
            max,
            Math.max(min, min + Math.round((raw - min) / step) * step),
        );
    // A thumb moved to `next`, kept between its neighbours.
    const moveThumb = (index: number, next: number) => {
        const low = values[index - 1] ?? min;
        const high = values[index + 1] ?? max;
        const clamped = Math.min(high, Math.max(low, snap(next)));
        if (clamped === values[index]) return;
        const updated = [...values];
        updated[index] = clamped;
        set(updated);
    };
    const pointValue = (event: GestureResponderEvent) => {
        if (!track.current) return undefined;
        const { start, length } = track.current;
        const at = vertical ? event.nativeEvent.pageY : event.nativeEvent.pageX;
        let ratio = Math.min(Math.max((at - start) / length, 0), 1);
        if (vertical || rtl) ratio = 1 - ratio;
        return min + ratio * (max - min);
    };
    const move = (event: GestureResponderEvent, index = active) => {
        const next = pointValue(event);
        if (next !== undefined) moveThumb(index, next);
    };
    const end = (cancelled: boolean) => {
        track.current = undefined;
        interaction.dragStop();
        if (cancelled) interaction.cancel();
        else interaction.release();
    };
    const id = (part: SliderPart) =>
        testIdOf(sliderAnatomy, part, props.testId);
    // The keys a range input takes: a step by the arrows (sideways by direction), the ends by
    // Home and End.
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = forward === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    const stepBy = (by: number) =>
        moveThumb(active, (values[active] ?? min) + by * step);
    const onKeyDown = (event: { nativeEvent: { key?: string } }) => {
        if (props.disabled) return;
        const key = event.nativeEvent.key;
        if (key === forward || key === "ArrowUp") stepBy(1);
        else if (key === backward || key === "ArrowDown") stepBy(-1);
        else if (key === "Home") moveThumb(active, min);
        else if (key === "End") moveThumb(active, max);
    };
    const stops = sliderStops(props.stops, props);
    return (
        <v.root.View
            ref={root as never}
            role="slider"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            aria-valuenow={values[active]}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-disabled={props.disabled}
            aria-orientation={vertical ? "vertical" : "horizontal"}
            focusable={!props.disabled}
            accessibilityActions={ADJUSTABLE}
            onAccessibilityAction={(event: {
                nativeEvent: { actionName: string };
            }) => stepBy(event.nativeEvent.actionName === "increment" ? 1 : -1)}
            {...({ onKeyDown } as object)}
            onFocus={interaction.handlers.onFocus}
            onBlur={interaction.handlers.onBlur}
            onPointerEnter={interaction.handlers.onHoverIn}
            onPointerLeave={interaction.handlers.onHoverOut}
            onStartShouldSetResponder={() => !props.disabled}
            onMoveShouldSetResponder={() => !props.disabled}
            onResponderGrant={(event: GestureResponderEvent) => {
                interaction.press(event);
                interaction.dragStart();
                const { pageX, pageY } = event.nativeEvent;
                const start = (from: number, length: number) => {
                    track.current = { start: from, length };
                    const at = {
                        nativeEvent: { pageX, pageY },
                    } as GestureResponderEvent;
                    const point = pointValue(at);
                    if (point === undefined) return;
                    // The thumb nearest the point moves.
                    let nearest = 0;
                    values.forEach((thumb, index) => {
                        if (
                            Math.abs(thumb - point) <=
                            Math.abs(values[nearest]! - point)
                        )
                            nearest = index;
                    });
                    setActive(nearest);
                    move(at, nearest);
                };
                // At once from the DOM on the web, so the first moves don't wait on measure,
                // which answers a turn later; through measure on a device.
                const rect = root.current?.getBoundingClientRect?.();
                if (rect) {
                    if (vertical) start(rect.top + window.scrollY, rect.height);
                    else start(rect.left + window.scrollX, rect.width);
                } else
                    root.current?.measure((_x, _y, width, height, left, top) =>
                        vertical ? start(top, height) : start(left, width),
                    );
            }}
            onResponderMove={(event: GestureResponderEvent) => move(event)}
            onResponderRelease={() => end(false)}
            onResponderTerminate={() => end(true)}
            {...(isPresent(props.insetIcon)
                ? {
                      onLayout: (event: LayoutChangeEvent) => {
                          const { width, height } = event.nativeEvent.layout;
                          setLength(vertical ? height : width);
                      },
                  }
                : {})}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <v.startTrack.View
                pointerEvents="none"
                style={s.startTrack}
                testID={id("startTrack")}
            />
            <v.track.View
                pointerEvents="none"
                style={s.track}
                testID={id("track")}
            />
            <v.activeTrack.View
                pointerEvents="none"
                style={s.activeTrack}
                testID={id("activeTrack")}
            />
            {isPresent(props.insetIcon) && (
                <v.insetIcon.View
                    pointerEvents="none"
                    style={s.insetIcon}
                    testID={id("insetIcon")}
                >
                    <IconSlot
                        {...iconSlot(selected, "insetIcon")}
                        motion={s.insetIcon}
                    >
                        {props.insetIcon}
                    </IconSlot>
                </v.insetIcon.View>
            )}
            {stops.length > 0 && (
                <v.markerGroup.View
                    pointerEvents="none"
                    style={s.markerGroup}
                    testID={id("markerGroup")}
                >
                    {stops.map((stop) => (
                        <Marker
                            key={stop}
                            selection={selection}
                            state={state}
                            percent={percentOf(stop)}
                            active={sliderStopActive(stop, values, props)}
                            testID={id("marker")}
                        />
                    ))}
                </v.markerGroup.View>
            )}
            {values.map((thumb, index) => (
                <Thumb
                    key={index}
                    selection={selection}
                    state={state}
                    percent={percents[index]!}
                    value={thumb}
                    showValue={
                        !!props.valueIndicator &&
                        index === active &&
                        !!indication.state.dragged
                    }
                    layer={
                        index === active
                            ? (selected) => indication.layer(selected)
                            : undefined
                    }
                    id={id}
                />
            ))}
        </v.root.View>
    );
}

/** Material's slider: `<Slider aria-label="Volume" defaultValue={30} />`, or a range with
 *  `defaultValue={[20, 60]}`. */
export const Slider = withEngine(SliderImpl, "Slider") as <
    V extends SliderValue = number,
>(
    props: SliderProps<V>,
) => ReactNode;

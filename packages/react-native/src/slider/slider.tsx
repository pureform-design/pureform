// The slider: a track, its active part, a state layer (where it ripples), and the handle, dragged
// by pointer or touch, which presses and drags it in its interaction source. Its value's position
// along the track is the instance's `value` token, a percentage, which the active track and the
// handle follow.

import { sliderAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { sliderSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    InteractiveProps,
    SliderPart,
    SliderVariantProps,
} from "@pureform/binding-core";
import { useRef } from "react";
import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";

import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { useComponentSlots } from "../styles";

const [INDICATION] = sliderAnatomy.indication!;

export interface SliderProps extends SliderVariantProps, InteractiveProps {
    /** The value. Controlled when defined. */
    readonly value?: number | undefined;
    readonly defaultValue?: number | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", number>) => void)
        | undefined;
    /** Default 0. */
    readonly min?: number | undefined;
    /** Default 100. */
    readonly max?: number | undefined;
    /** Default 1. */
    readonly step?: number | undefined;
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
        ) => void,
    ) => void;
}

// What assistive technology can do to it.
const ADJUSTABLE = [{ name: "increment" }, { name: "decrement" }] as const;

function SliderImpl(props: SliderProps): ReactNode {
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const step = props.step ?? 1;
    const [value, setValue] = useControllable(
        "Slider",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        min,
    );
    // Where the track sits on the page, read when a drag starts; until then, none.
    const origin = useRef<{ x: number; width: number }>(undefined);
    const root = useRef<Measurable>(null);
    const percent =
        max > min
            ? ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100
            : 0;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
    });
    const { interaction } = indication;
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<SliderPart>(
        "slider",
        indication.select(sliderSelection(props, percent)),
        {
            ...indication.states(),
            dragged: indication.state.dragged,
            ...(props.disabled ? { disabled: true } : {}),
        },
    );
    const move = (event: GestureResponderEvent) => {
        if (!origin.current) return;
        const { x, width } = origin.current;
        const ratio = Math.min(
            Math.max((event.nativeEvent.pageX - x) / width, 0),
            1,
        );
        const next = Math.min(
            max,
            min + Math.round((ratio * (max - min)) / step) * step,
        );
        if (next !== value) setValue(next);
    };
    const end = (cancelled: boolean) => {
        origin.current = undefined;
        interaction.dragStop();
        if (cancelled) interaction.cancel();
        else interaction.release();
    };
    const id = (part: SliderPart) =>
        testIdOf(sliderAnatomy, part, props.testId);
    // The keys a range input takes: a step by the arrows (sideways by direction), the ends by
    // Home and End.
    const forward = useDirection() === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backward = forward === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    const stepBy = (by: number) =>
        setValue(Math.min(max, Math.max(min, value + by * step)));
    const onKeyDown = (event: { nativeEvent: { key?: string } }) => {
        if (props.disabled) return;
        const key = event.nativeEvent.key;
        if (key === forward || key === "ArrowUp") stepBy(1);
        else if (key === backward || key === "ArrowDown") stepBy(-1);
        else if (key === "Home") setValue(min);
        else if (key === "End") setValue(max);
    };
    return (
        <v.root.View
            ref={root as never}
            role="slider"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-disabled={props.disabled}
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
                const pageX = event.nativeEvent.pageX;
                const start = (x: number, width: number) => {
                    origin.current = { x, width };
                    move({ nativeEvent: { pageX } } as GestureResponderEvent);
                };
                // At once from the DOM on the web, so the first moves don't wait on measure,
                // which answers a turn later; through measure on a device.
                const rect = root.current?.getBoundingClientRect?.();
                if (rect) start(rect.left + window.scrollX, rect.width);
                else
                    root.current?.measure((_x, _y, width, _h, left) =>
                        start(left, width),
                    );
            }}
            onResponderMove={move}
            onResponderRelease={() => end(false)}
            onResponderTerminate={() => end(true)}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
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
            <v.stateLayer.View
                pointerEvents="none"
                style={s.stateLayer}
                testID={id("stateLayer")}
            >
                {indication.layer(selected)}
            </v.stateLayer.View>
            <v.handle.View
                pointerEvents="none"
                style={s.handle}
                testID={id("handle")}
            />
        </v.root.View>
    );
}

/** Material's slider: `<Slider aria-label="Volume" defaultValue={30} />`. */
export const Slider = withEngine(SliderImpl, "Slider");

// The slider: a track, its active part, a state layer, and the handle, dragged by pointer or
// touch. Its value's position along the track is the instance's `value` token, a percentage,
// which the active track and the handle follow.

import { sliderAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { sliderSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    SliderPart,
    SliderVariantProps,
} from "@pureform/binding-core";
import { pressableState } from "@pureform/rn-adapter/react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";

import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

export interface SliderProps extends SliderVariantProps {
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

function SliderImpl(props: SliderProps): ReactNode {
    const engine = useEngine();
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
    const [dragged, setDragged] = useState(false);
    const [hovered, setHovered] = useState(false);
    // Where the track sits on the page, read when a drag starts; until then, none.
    const origin = useRef<{ x: number; width: number }>(undefined);
    const root = useRef<Measurable>(null);
    const percent =
        max > min
            ? ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100
            : 0;
    const { styles: s } = useComponentSlots(
        "slider",
        sliderSelection(props, percent),
        {
            ...pressableState({ pressed: dragged, hovered }),
            dragged,
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
    const end = () => {
        origin.current = undefined;
        setDragged(false);
    };
    const id = (part: SliderPart) =>
        testIdOf(sliderAnatomy, part, props.testId);
    return (
        <engine.View
            ref={root as never}
            role="slider"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-disabled={props.disabled}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onStartShouldSetResponder={() => !props.disabled}
            onMoveShouldSetResponder={() => !props.disabled}
            onResponderGrant={(event: GestureResponderEvent) => {
                setDragged(true);
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
            onResponderRelease={end}
            onResponderTerminate={end}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <engine.View
                pointerEvents="none"
                style={s.track}
                testID={id("track")}
            />
            <engine.View
                pointerEvents="none"
                style={s.activeTrack}
                testID={id("activeTrack")}
            />
            <engine.View
                pointerEvents="none"
                style={s.stateLayer}
                testID={id("stateLayer")}
            />
            <engine.View
                pointerEvents="none"
                style={s.handle}
                testID={id("handle")}
            />
        </engine.View>
    );
}

/** Material's slider: `<Slider aria-label="Volume" defaultValue={30} />`. */
export const Slider = withEngine(SliderImpl, "Slider");

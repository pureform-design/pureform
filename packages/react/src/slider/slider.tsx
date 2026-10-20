// The slider: Root on the slider machine (Zag's), its parts as the preset draws them (the inactive
// tracks either side of the active one, the stops, and per thumb a state layer, a handle, a value
// indicator, and a hidden input), and the ready-made Slider over them. Each handle has the
// `slider` role and takes focus and the keys; the root takes the pointer. The parts are placed by
// tokens: Root's from the value, and each thumb's and stop's own on its parts.

import { sliderAnatomy } from "@pureform/anatomy";
import {
    SLIDER_INPUT_LABEL_PROPS,
    SLIDER_ROOT_PROPS,
    sliderControllableProps,
    sliderMachineProps,
    sliderMarkerTokens,
    sliderNativeDefault,
    sliderSelection,
    sliderStopActive,
    sliderStops,
    sliderThumbTokens,
} from "@pureform/binding-core";
import type { SliderRootOwnProps, SliderValue } from "@pureform/binding-core";
import { setNativeDefault } from "@pureform/machines/form";
import * as slider from "@pureform/machines/slider";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    Fragment,
    type ElementType,
    type ReactNode,
    useCallback,
    useId,
    useRef,
    useState,
} from "react";

import { useClasses } from "../classes";
import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { useOwnInteractionSource } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof sliderAnatomy;

/** What Root shares with its parts. */
interface SliderContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: slider.Api<PropTypes>;
    readonly props: SliderRootOwnProps;
    /** Keeps a thumb's input, for the form reset. Stable. */
    readonly setInput: (index: number, input: HTMLInputElement | null) => void;
}

const context = createPartContext<SliderContextValue>("Slider");

/** Root's props: the variants and tokens, the machine's props (`value`, `min`, `max`, `step`,
 *  `name`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface SliderRootProps<V extends SliderValue = SliderValue>
    extends Omit<PartProps, keyof SliderRootOwnProps>, SliderRootOwnProps<V> {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SliderPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A thumb's part's props: which thumb, 0 unless a range's. */
export interface SliderThumbPartProps extends SliderPartProps {
    readonly index?: number | undefined;
}

/** A stop's props: the value it marks. */
export interface SliderMarkerProps extends SliderPartProps {
    readonly value: number;
}

/** The slider's root: it runs the machine, and sets the tokens its parts are placed by. */
function Root(props: SliderRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", SliderValue>(
        "Slider",
        "value",
        props,
    );
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const [first, setFirst] = useState<HTMLInputElement | null>(null);
    const source = useOwnInteractionSource(props.interactionSource);
    const service = useMachine(slider.machine, {
        id,
        interactionSource: source,
        dir,
        ...sliderMachineProps(props, id),
        ...sliderControllableProps(value.machineProps),
    });
    const api = slider.connect(service, normalizeProps);
    useFormReset(first, {
        resetsTo: sliderNativeDefault(value.resetsTo, props.min),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                api.setValue(
                    sliderNativeDefault(value.defaultValue, props.min)
                        .split(",")
                        .map(Number),
                ),
            ),
        writeDefault: (_, defaults) =>
            String(defaults)
                .split(",")
                .forEach((next, index) => {
                    const input = inputs.current[index];
                    if (input) setNativeDefault(input, next);
                }),
    });
    const setInput = useCallback(
        (index: number, input: HTMLInputElement | null) => {
            inputs.current[index] = input;
            if (index === 0) setFirst(input);
        },
        [],
    );
    const scope = useComponent(sliderAnatomy, {
        selection: sliderSelection(props, api.percents),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
    });
    const { as, ...rest } = omitProps(props, SLIDER_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, props, setInput }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                states: { pressed: api.dragging },
                props: rest,
            })}
        </context.Provider>
    );
}

const drawn = (
    part: "startTrack" | "track" | "activeTrack" | "markerGroup",
    name: string,
    machine: (api: slider.Api<PropTypes>) => object,
) =>
    function Drawn({ unstyled, ...props }: SliderPartProps): ReactNode {
        const { scope, api } = context.use(name);
        return scope.render(part, {
            element: part === "markerGroup" ? "div" : "span",
            machine: machine(api),
            unstyled,
            props,
        });
    };

/** The inactive track before the active one: a range's, or a centered slider's. Empty. */
const StartTrack = drawn("startTrack", "StartTrack", (api) =>
    api.getStartTrackProps(),
);
/** The inactive track after the active one. Empty. */
const Track = drawn("track", "Track", (api) => api.getTrackProps());
/** The active track. Empty. */
const ActiveTrack = drawn("activeTrack", "ActiveTrack", (api) =>
    api.getActiveTrackProps(),
);
/** Holds the stops (`Marker`). */
const MarkerGroup = drawn("markerGroup", "MarkerGroup", (api) =>
    api.getMarkerGroupProps(),
);

/** The token style a part sets for itself, from the registry. */
const useOwnTokens = (tokens: Record<string, number>) =>
    useClasses("slider", { tokens }).root?.style;

/** A stop indicator at `value`, in the active track's colors where it's on it. */
function Marker({ unstyled, value, ...props }: SliderMarkerProps): ReactNode {
    const { scope, api, props: root } = context.use("Marker");
    const style = useOwnTokens(
        sliderMarkerTokens(
            api.percentOf(value),
            sliderStopActive(value, api.value, root),
        ),
    );
    return scope.render("marker", {
        element: "span",
        machine: { ...api.getMarkerProps({ value }), style },
        unstyled,
        props,
    });
}

const thumbPart = (
    part: "stateLayer" | "handle" | "valueIndicator",
    name: string,
    element: "span" | "div",
    machine: (api: slider.Api<PropTypes>, index: number) => object,
) =>
    function Thumb({
        unstyled,
        index = 0,
        ...props
    }: SliderThumbPartProps): ReactNode {
        const { scope, api } = context.use(name);
        const style = useOwnTokens(sliderThumbTokens(api.percents[index] ?? 0));
        return scope.render(part, {
            element,
            machine: { ...machine(api, index), style },
            // A drag from the track presses the thumb it moves.
            states:
                part === "handle"
                    ? { pressed: api.dragging && api.focusedIndex === index }
                    : undefined,
            unstyled,
            props,
        });
    };

/** A thumb's state layer: the circle behind the round handle that shows hover, focus, and
 *  press. Empty. */
const StateLayer = thumbPart("stateLayer", "StateLayer", "span", (api, index) =>
    api.getStateLayerProps(index),
);
/** A thumb's handle, with the `slider` role: name it here (`aria-label`). Empty. */
const Handle = thumbPart("handle", "Handle", "div", (api, index) =>
    api.getHandleProps(index),
);
const ValueIndicatorPart = thumbPart(
    "valueIndicator",
    "ValueIndicator",
    "span",
    (api, index) => api.getValueIndicatorProps(index),
);
/** A thumb's value, shown while it's dragged. Its children default to the value. */
function ValueIndicator(props: SliderThumbPartProps): ReactNode {
    const { api } = context.use("ValueIndicator");
    return (
        <ValueIndicatorPart {...props}>
            {props.children ?? api.value[props.index ?? 0]}
        </ValueIndicatorPart>
    );
}

/** A thumb's hidden input, which submits its value with the form. */
function Input({ unstyled, index = 0, ...props }: SliderThumbPartProps): ReactNode {
    const { scope, api, setInput } = context.use("Input");
    const ref = useCallback(
        (element: HTMLElement | null) =>
            setInput(index, element as HTMLInputElement | null),
        [setInput, index],
    );
    return scope.render("input", {
        element: "input",
        machine: api.getInputProps(index),
        ref,
        unstyled,
        props,
    });
}

/** The ready-made slider's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part; `aria-label` (one per thumb for a range), `aria-labelledby`, `aria-describedby`, and
 *  `aria-valuetext` go on the handles. */
export interface SliderProps<V extends SliderValue = SliderValue>
    extends
        Omit<
            SliderRootProps<V>,
            keyof SlotKeyedProps<Anatomy> | "children" | "aria-label"
        >,
        SlotKeyedProps<Anatomy> {
    readonly "aria-label"?: string | readonly string[] | undefined;
}

/** The ready-made slider: every part, in the preset's structure. */
function ReadyMade<V extends SliderValue = number>(
    props: SliderProps<V>,
): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        ...rest
    } = props;
    const rootProps = omitProps(rest, SLIDER_INPUT_LABEL_PROPS);
    const label = (index: number) => {
        const picked: Record<string, unknown> = {};
        for (const key of SLIDER_INPUT_LABEL_PROPS) picked[key] = props[key];
        const named = props["aria-label"];
        if (typeof named === "object") picked["aria-label"] = named[index];
        return picked;
    };
    const slot = useSlotProps(props as never);
    const given = props.value ?? props.defaultValue;
    const thumbs = typeof given === "object" ? given.length : 1;
    const stops = sliderStops(props.stops, props);
    return (
        <Root {...(rootProps as SliderRootProps)} {...(slot("root") as object)}>
            <StartTrack {...slot("startTrack")} />
            <Track {...slot("track")} />
            <ActiveTrack {...slot("activeTrack")} />
            {stops.length > 0 && (
                <MarkerGroup {...slot("markerGroup")}>
                    {stops.map((stop) => (
                        <Marker key={stop} {...slot("marker")} value={stop} />
                    ))}
                </MarkerGroup>
            )}
            {Array.from({ length: thumbs }, (_, index) => (
                <Fragment key={index}>
                    <Handle {...label(index)} {...slot("handle")} index={index}>
                        <StateLayer {...slot("stateLayer")} index={index} />
                    </Handle>
                    {props.valueIndicator && (
                        <ValueIndicator
                            {...slot("valueIndicator")}
                            index={index}
                        />
                    )}
                    <Input {...slot("input")} index={index} />
                </Fragment>
            ))}
        </Root>
    );
}

/** Material's slider. Use it ready-made, `<Slider aria-label="Volume" defaultValue={40}
 *  name="volume" />` (a range with `defaultValue={[20, 60]}`), or compose its parts under
 *  `Slider.Root`: `StartTrack`, `Track`, `ActiveTrack`, `MarkerGroup` with `Marker`s, then per
 *  thumb (`index`) `Handle` holding `StateLayer`, `ValueIndicator`, and `Input`. */
export const Slider = Object.assign(ReadyMade, {
    Root,
    StartTrack,
    Track,
    ActiveTrack,
    MarkerGroup,
    Marker,
    StateLayer,
    Handle,
    ValueIndicator,
    Input,
});

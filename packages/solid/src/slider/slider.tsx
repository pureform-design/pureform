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
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    omit,
    Show,
} from "solid-js";

import { useClasses } from "../classes";
import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { useOwnInteractionSource } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof sliderAnatomy;

/** What Root shares with its parts. */
interface SliderContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<slider.Api<PropTypes>>;
    readonly props: SliderRootOwnProps;
    readonly setInput: (index: number, input: HTMLInputElement) => void;
}

const context = createPartContext<SliderContextValue>("Slider");

/** Root's props: the variants and tokens, the machine's props (`value`, `min`, `max`, `step`,
 *  `name`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface SliderRootProps<V extends SliderValue = SliderValue>
    extends Omit<PartProps, keyof SliderRootOwnProps>, SliderRootOwnProps<V> {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
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
function Root(props: SliderRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", SliderValue>(
        "Slider",
        "value",
        props,
    );
    // The thumbs' inputs, for the form reset: the first tracked, every one written.
    const inputs: HTMLInputElement[] = [];
    const [first, setFirst] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const source = useOwnInteractionSource(() => props.interactionSource);
    const service = useMachine(slider.machine, () => ({
        id,
        interactionSource: source(),
        dir: dir(),
        ...sliderMachineProps(props, id),
        ...sliderControllableProps(value.machineProps()),
    }));
    const api = createMemo(() => slider.connect(service, normalizeProps));
    useFormReset(first, {
        resetsTo: () => sliderNativeDefault(value.resetsTo(), props.min),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                api().setValue(
                    sliderNativeDefault(
                        value.defaultValue,
                        props.min,
                    )
                        .split(",")
                        .map(Number),
                ),
            ),
        writeDefault: (_, defaults) =>
            String(defaults)
                .split(",")
                .forEach((next, index) => {
                    const input = inputs[index];
                    if (input) setNativeDefault(input, next);
                }),
    });
    const scope = useComponent(sliderAnatomy, {
        selection: () => sliderSelection(props, api().percents),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
        interactionSource: source,
    });
    const setInput = (index: number, input: HTMLInputElement) => {
        inputs[index] = input;
        if (index === 0) setFirst(input);
    };
    return (
        <context.Provider value={{ scope, api, props, setInput }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                states: () => ({ pressed: api().dragging }),
                props: omit(props, "as", ...SLIDER_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

const drawn = (
    part: "startTrack" | "track" | "activeTrack" | "markerGroup",
    name: string,
    machine: (api: slider.Api<PropTypes>) => object,
) =>
    function Drawn(props: SliderPartProps): JSX.Element {
        const { scope, api } = context.use(name);
        return scope.render(part, {
            element: part === "markerGroup" ? "div" : "span",
            machine: () => machine(api()),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
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
const useOwnTokens = (tokens: () => Record<string, number>) => {
    const classes = useClasses("slider", () => ({ tokens: tokens() }));
    return () => classes().root?.style;
};

/** A stop indicator at `value`, in the active track's colors where it's on it. */
function Marker(props: SliderMarkerProps): JSX.Element {
    const { scope, api, props: root } = context.use("Marker");
    const style = useOwnTokens(() =>
        sliderMarkerTokens(
            api().percentOf(props.value),
            sliderStopActive(props.value, api().value, root),
        ),
    );
    return scope.render("marker", {
        element: "span",
        machine: () => ({
            ...api().getMarkerProps({ value: props.value }),
            style: style(),
        }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "value"),
    });
}

const thumbPart = (
    part: "stateLayer" | "handle" | "valueIndicator",
    name: string,
    element: "span" | "div",
    machine: (api: slider.Api<PropTypes>, index: number) => object,
) =>
    function Thumb(props: SliderThumbPartProps): JSX.Element {
        const { scope, api } = context.use(name);
        const index = () => props.index ?? 0;
        const style = useOwnTokens(() =>
            sliderThumbTokens(api().percents[index()] ?? 0),
        );
        return scope.render(part, {
            element,
            machine: () => ({
                ...machine(api(), index()),
                style: style(),
            }),
            // A drag from the track presses the thumb it moves.
            states: () =>
                part === "handle"
                    ? {
                          pressed:
                              api().dragging &&
                              api().focusedIndex === index(),
                      }
                    : undefined,
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "index"),
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
/** A thumb's value, shown while it's dragged. Its children default to the value. */
const ValueIndicatorPart = thumbPart(
    "valueIndicator",
    "ValueIndicator",
    "span",
    (api, index) => api.getValueIndicatorProps(index),
);
function ValueIndicator(props: SliderThumbPartProps): JSX.Element {
    const { api } = context.use("ValueIndicator");
    return (
        <ValueIndicatorPart {...props}>
            {props.children ?? api().value[props.index ?? 0]}
        </ValueIndicatorPart>
    );
}

/** A thumb's hidden input, which submits its value with the form. */
function Input(props: SliderThumbPartProps): JSX.Element {
    const { scope, api, setInput } = context.use("Input");
    const index = () => props.index ?? 0;
    return scope.render("input", {
        element: "input",
        machine: () => api().getInputProps(index()),
        ref: (element) => setInput(index(), element as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "index"),
    });
}

/** The ready-made slider's props: Root's, with `class`, `style`, and `slotProps` keyed by part;
 *  `aria-label` (one per thumb for a range), `aria-labelledby`, `aria-describedby`, and
 *  `aria-valuetext` go on the handles. */
export interface SliderProps<V extends SliderValue = SliderValue>
    extends
        Omit<
            SliderRootProps<V>,
            keyof SlotKeyedProps<Anatomy> | "children" | "aria-label"
        >,
        SlotKeyedProps<Anatomy> {
    readonly "aria-label"?: string | readonly string[] | undefined;
    readonly "aria-valuetext"?: string | undefined;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...SLIDER_INPUT_LABEL_PROPS,
] as const;

/** The ready-made slider: every part, in the preset's structure. */
function ReadyMade<V extends SliderValue = number>(
    props: SliderProps<V>,
): JSX.Element {
    const label = (index: number) => {
        const picked: Record<string, unknown> = {};
        for (const key of SLIDER_INPUT_LABEL_PROPS) picked[key] = props[key];
        const named = props["aria-label"];
        if (typeof named === "object") picked["aria-label"] = named[index];
        return picked;
    };
    const slots = createSlotProps(props as never);
    const own = omit(props, ...READY_MADE_PROPS) as SliderRootProps;
    const root = slots("root") as object;
    const thumbs = createMemo(() => {
        const given = props.value ?? props.defaultValue;
        const count = typeof given === "object" ? given.length : 1;
        return Array.from({ length: count }, (_, index) => index);
    });
    const stops = createMemo(() => sliderStops(props.stops, props));
    return (
        <Root {...own} {...root}>
            <StartTrack {...slots("startTrack")} />
            <Track {...slots("track")} />
            <ActiveTrack {...slots("activeTrack")} />
            <Show when={stops().length > 0}>
                <MarkerGroup {...slots("markerGroup")}>
                    <For each={stops()}>
                        {(stop) => (
                            <Marker {...slots("marker")} value={stop} />
                        )}
                    </For>
                </MarkerGroup>
            </Show>
            <For each={thumbs()}>
                {(index) => (
                    <>
                        <Handle
                            {...label(index)}
                            {...slots("handle")}
                            index={index}
                        >
                            <StateLayer
                                {...slots("stateLayer")}
                                index={index}
                            />
                        </Handle>
                        <Show when={props.valueIndicator}>
                            <ValueIndicator
                                {...slots("valueIndicator")}
                                index={index}
                            />
                        </Show>
                        <Input {...slots("input")} index={index} />
                    </>
                )}
            </For>
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

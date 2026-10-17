// The slider: Root on pureform's slider machine, its parts as the preset draws them (the track, the
// active track, the state layer, and the handle, placed by the value token, under a native range
// input laid invisibly over them), and the ready-made Slider over them. The native input takes the
// pointer, the keyboard, the form, and assistive technology; the binding owns the form reset.

import { sliderAnatomy } from "@pureform/anatomy";
import {
    SLIDER_INPUT_LABEL_PROPS,
    SLIDER_ROOT_PROPS,
    sliderMachineProps,
    sliderNativeDefault,
    sliderSelection,
} from "@pureform/binding-core";
import type { SliderRootOwnProps } from "@pureform/binding-core";
import { syncTextInput } from "@pureform/binding-core/dom";
import * as slider from "@pureform/machines/slider";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    flush,
    omit,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof sliderAnatomy;

/** What Root shares with its parts. */
interface SliderContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<slider.Api<PropTypes>>;
    readonly setInput: (input: HTMLInputElement) => void;
}

const context = createPartContext<SliderContextValue>("Slider");

/** Root's props: the variants and tokens, the machine's props (`value`, `min`, `max`, `step`,
 *  `name`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface SliderRootProps
    extends Omit<PartProps, keyof SliderRootOwnProps>, SliderRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SliderPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The slider's root: it runs the machine, and sets the value token its parts are placed by. */
function Root(props: SliderRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", number>("Slider", "value", props);
    const [input, setInput] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const service = useMachine(slider.machine, () => ({
        id,
        dir: dir(),
        ...sliderMachineProps(props),
        ...value.machineProps(),
    }));
    const api = createMemo(() => slider.connect(service, normalizeProps));
    useFormReset(input, {
        resetsTo: () => sliderNativeDefault(value.resetsTo(), props.min),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                service.send({
                    type: "RESET",
                    value: value.defaultValue ?? props.min ?? 0,
                }),
            ),
    });
    const scope = useComponent(sliderAnatomy, {
        selection: () => sliderSelection(props, api().percent),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, api, setInput }}>
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
    part: "track" | "activeTrack" | "stateLayer" | "handle",
    name: string,
) =>
    function Drawn(props: SliderPartProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

/** The whole track. Empty. */
const Track = drawn("track", "Track");
/** The track from the start to the value. Empty. */
const ActiveTrack = drawn("activeTrack", "ActiveTrack");
/** The circle behind the handle that shows hover, focus, and press. Empty. */
const StateLayer = drawn("stateLayer", "StateLayer");
/** The handle, at the value. Empty. */
const Handle = drawn("handle", "Handle");

/** The native range input, invisible over the slider: it takes every interaction, submits with
 *  the form, and is what assistive technology reads, so name it here (`aria-label`). */
function Input(props: SliderPartProps): JSX.Element {
    const { scope, api, setInput } = context.use("Input");
    // The browser moves the input before the machine hears of it. Once the machine has sent the
    // change and the owner's update has applied, the input is put back to the machine's value, so
    // a controlled or read-only slider the owner didn't change doesn't move.
    const onInput = (event: InputEvent) => {
        const element = event.currentTarget as HTMLInputElement;
        queueMicrotask(() => {
            flush();
            syncTextInput(element, String(untrack(() => api().value)));
        });
    };
    return scope.render("input", {
        element: "input",
        machine: () =>
            combinePartProps([
                api().getInputProps() as Readonly<Record<string, unknown>>,
                { onInput },
            ]),
        ref: (element) => setInput(element as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made slider's props: Root's, with `class`, `style`, and `slotProps` keyed by part;
 *  `aria-label`, `aria-labelledby`, `aria-describedby`, and `aria-valuetext` go on the input. */
export interface SliderProps
    extends
        Omit<SliderRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy> {
    readonly "aria-valuetext"?: string | undefined;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...SLIDER_INPUT_LABEL_PROPS,
] as const;

/** The ready-made slider: every part, in the preset's structure. */
function ReadyMade(props: SliderProps): JSX.Element {
    const slot = (part: Parameters<typeof slotPartProps<Anatomy>>[1]) =>
        slotPartProps(props, part);
    const label = () => {
        const picked: Record<string, unknown> = {};
        for (const key of SLIDER_INPUT_LABEL_PROPS) picked[key] = props[key];
        return picked;
    };
    return (
        <Root
            {...(omit(props, ...READY_MADE_PROPS) as SliderRootProps)}
            {...(slot("root") as object)}
        >
            <Track {...slot("track")} />
            <ActiveTrack {...slot("activeTrack")} />
            <StateLayer {...slot("stateLayer")} />
            <Handle {...slot("handle")} />
            <Input {...label()} {...slot("input")} />
        </Root>
    );
}

/** Material's slider. Use it ready-made, `<Slider aria-label="Volume" defaultValue={40}
 *  name="volume" />`, or compose its parts under `Slider.Root`: `Track`, `ActiveTrack`,
 *  `StateLayer`, `Handle`, then `Input`. */
export const Slider = Object.assign(ReadyMade, {
    Root,
    Track,
    ActiveTrack,
    StateLayer,
    Handle,
    Input,
});

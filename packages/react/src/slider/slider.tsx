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
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ChangeEvent,
    type ElementType,
    type ReactNode,
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { useOwnInteractionSource } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof sliderAnatomy;

/** What Root shares with its parts. */
interface SliderContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: slider.Api<PropTypes>;
    readonly setInput: (input: HTMLInputElement | null) => void;
    /** Puts the input back after a change the slider didn't take; see `Input`. Stable. */
    readonly restoreInput: (input: HTMLInputElement) => void;
}

const context = createPartContext<SliderContextValue>("Slider");

/** Root's props: the variants and tokens, the machine's props (`value`, `min`, `max`, `step`,
 *  `name`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface SliderRootProps
    extends Omit<PartProps, keyof SliderRootOwnProps>, SliderRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SliderPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The slider's root: it runs the machine, and sets the value token its parts are placed by. */
function Root(props: SliderRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", number>("Slider", "value", props);
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    const source = useOwnInteractionSource(props.interactionSource);
    const service = useMachine(slider.machine, {
        id,
        interactionSource: source,
        dir,
        ...sliderMachineProps(props),
        ...value.machineProps,
    });
    const api = slider.connect(service, normalizeProps);
    useFormReset(input, {
        resetsTo: sliderNativeDefault(value.resetsTo, props.min),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                service.send({
                    type: "RESET",
                    value: value.defaultValue ?? props.min ?? 0,
                }),
            ),
    });
    // What the input shows when the slider didn't take a change, as last committed: the
    // controlled value, or the machine's while read-only. Read after the change, not captured.
    const shown = useRef<number | undefined>(undefined);
    useLayoutEffect(() => {
        shown.current = value.controlled
            ? value.value
            : props.readOnly
              ? api.value
              : undefined;
    });
    const restoreInput = useCallback((element: HTMLInputElement) => {
        if (shown.current !== undefined)
            syncTextInput(element, String(shown.current));
    }, []);
    const scope = useComponent(sliderAnatomy, {
        selection: sliderSelection(props, api.percent),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
    });
    const { as, ...rest } = omitProps(props, SLIDER_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, setInput, restoreInput }}>
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
    part: "track" | "activeTrack" | "stateLayer" | "handle",
    name: string,
) =>
    function Drawn({ unstyled, ...props }: SliderPartProps): ReactNode {
        const { scope } = context.use(name);
        return scope.render(part, { element: "span", unstyled, props });
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
function Input({ unstyled, ...props }: SliderPartProps): ReactNode {
    const { scope, api, setInput, restoreInput } = context.use("Input");
    // The browser moves the input before the machine hears of it. Once the machine has sent the
    // change and told the owner, a controlled or read-only input is put back to the value last
    // committed; the owner's update, if any, has moved it already.
    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        const element = event.currentTarget;
        queueMicrotask(() => restoreInput(element));
    };
    return scope.render("input", {
        element: "input",
        machine: combinePartProps([
            api.getInputProps() as Readonly<Record<string, unknown>>,
            { onChange },
        ]),
        ref: setInput as (element: HTMLElement | null) => void,
        unstyled,
        props,
    });
}

/** The ready-made slider's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part; `aria-label`, `aria-labelledby`, `aria-describedby`, and `aria-valuetext` go on the
 *  input. */
export interface SliderProps
    extends
        Omit<SliderRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy> {}

/** The ready-made slider: every part, in the preset's structure. */
function ReadyMade(props: SliderProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        ...rest
    } = props;
    const rootProps = omitProps(rest, SLIDER_INPUT_LABEL_PROPS);
    const label: Record<string, unknown> = {};
    for (const key of SLIDER_INPUT_LABEL_PROPS) label[key] = props[key];
    const slot = (part: Parameters<typeof slotPartProps<Anatomy>>[1]) =>
        slotPartProps(props, part);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <Track {...slot("track")} />
            <ActiveTrack {...slot("activeTrack")} />
            <StateLayer {...slot("stateLayer")} />
            <Handle {...slot("handle")} />
            <Input {...label} {...slot("input")} />
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

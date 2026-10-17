// The switch: Root on Zag's switch machine, its parts as the preset draws them (a native checkbox
// with `role="switch"` laid over the track, the state layer and handle inside the track, and an
// optional icon in the handle), and the ready-made Switch over them. The binding owns the form
// reset and the fieldset rule rather than Zag.

import { switchControlAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    SWITCH_ROOT_PROPS,
    switchInputProps,
    switchMachineProps,
    switchNativeDefault,
    switchSelection,
} from "@pureform/binding-core";
import type {
    SwitchContentProps,
    SwitchRootOwnProps,
} from "@pureform/binding-core";
import { syncCheckedInput } from "@pureform/binding-core/dom";
import * as switchControl from "@pureform/machines/switch";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type MouseEvent,
    type ReactNode,
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { useFieldsetDisabled, useFormReset } from "../form";
import { useOwnInteractionSource } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof switchControlAnatomy;

/** What Root shares with its parts. */
interface SwitchContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: switchControl.Api<PropTypes>;
    readonly readOnly: boolean | undefined;
    readonly setInput: (input: HTMLInputElement | null) => void;
    /** Puts the input back to the controlled value after a click; see `Input`. Stable. */
    readonly restoreInput: (input: HTMLInputElement) => void;
}

const context = createPartContext<SwitchContextValue>("Switch");

/** Root's props: the variants and tokens, the machine's props (`checked`, `disabled`, `name`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface SwitchRootProps
    extends Omit<PartProps, keyof SwitchRootOwnProps>, SwitchRootOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SwitchPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The switch's root: a `<label>` around the native input, so its touch target toggles it. */
function Root(props: SwitchRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const checked = useControllable<"checked", boolean>(
        "Switch",
        "checked",
        props,
    );
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(input);
    const interaction = useOwnInteractionSource();
    const service = useMachine(switchControl.machine, {
        id,
        ...interaction,
        dir,
        ...switchMachineProps(props, fieldsetDisabled),
        ...checked.machineProps,
    });
    const api = switchControl.connect(service, normalizeProps);
    useFormReset(input, {
        resetsTo: switchNativeDefault(checked.resetsTo),
        onBeforeReset: checked.beforeReset,
        onReset: () =>
            checked.reset(() =>
                service.send({
                    type: "CHECKED.SET",
                    checked: checked.defaultValue ?? false,
                    isTrusted: true,
                }),
            ),
    });
    // The controlled value as last committed, read after a click rather than captured by it.
    const control = useRef({
        controlled: checked.controlled,
        value: checked.value,
    });
    useLayoutEffect(() => {
        control.current = {
            controlled: checked.controlled,
            value: checked.value,
        };
    });
    const restoreInput = useCallback((element: HTMLInputElement) => {
        const { controlled, value } = control.current;
        if (controlled && value !== undefined) syncCheckedInput(element, value);
    }, []);
    const scope = useComponent(switchControlAnatomy, {
        selection: switchSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, SWITCH_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                api,
                readOnly: props.readOnly,
                setInput,
                restoreInput,
            }}
        >
            {scope.render("root", {
                element: "label",
                as,
                machine: api.getRootProps(),
                states: { pressed: service.context.get("active") as boolean },
                props: rest,
            })}
        </context.Provider>
    );
}

/** The 48px touch target around the control. Empty. */
function TouchTarget({ unstyled, ...props }: SwitchPartProps): ReactNode {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", { element: "span", unstyled, props });
}

/** The native checkbox with `role="switch"`, invisible over the track: it takes every
 *  interaction, submits with the form, and is what assistive technology reads, so name it here
 *  (`aria-label`). */
function Input({ unstyled, ...props }: SwitchPartProps): ReactNode {
    const { scope, api, readOnly, setInput, restoreInput } =
        context.use("Input");
    // The browser toggles the input on a click before the machine hears of it. Once the machine
    // has sent the change and told the owner, a controlled input is put back to the value last
    // committed; the owner's update, if any, then moves it with the machine.
    const onClick = (event: MouseEvent<HTMLInputElement>) => {
        const element = event.currentTarget;
        queueMicrotask(() => restoreInput(element));
    };
    return scope.render("input", {
        element: "input",
        machine: combinePartProps([
            switchInputProps(api.getHiddenInputProps(), readOnly),
            { onClick },
        ]),
        ref: setInput as (element: HTMLElement | null) => void,
        unstyled,
        props,
    });
}

/** The track, which holds the state layer and the handle, hidden from assistive technology. */
function Track({ unstyled, ...props }: SwitchPartProps): ReactNode {
    const { scope, api } = context.use("Track");
    return scope.render("track", {
        element: "span",
        machine: api.getControlProps(),
        unstyled,
        props,
    });
}

/** The circle behind the handle that shows hover, focus, and press. Empty. */
function StateLayer({ unstyled, ...props }: SwitchPartProps): ReactNode {
    const { scope } = context.use("StateLayer");
    return scope.render("stateLayer", { element: "span", unstyled, props });
}

/** The handle, which slides along the track and grows when on. */
function Handle({ unstyled, ...props }: SwitchPartProps): ReactNode {
    const { scope, api } = context.use("Handle");
    return scope.render("handle", {
        element: "span",
        machine: api.getThumbProps(),
        unstyled,
        props,
    });
}

/** The handle's icon, shown while the switch is on. Render it only when there's an icon. */
function Icon({ unstyled, ...props }: SwitchPartProps): ReactNode {
    const { scope } = context.use("Icon");
    return scope.render("icon", { element: "span", unstyled, props });
}

/** The ready-made switch's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and the handle's icon. `aria-label`, `aria-labelledby`, and `aria-describedby` go on the
 *  input. */
export interface SwitchProps
    extends
        Omit<SwitchRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SwitchContentProps<ReactNode> {}

/** The ready-made switch: every part, in the preset's structure; the icon only when given. */
function ReadyMade(props: SwitchProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        "aria-label": ariaLabel,
        "aria-labelledby": ariaLabelledBy,
        "aria-describedby": ariaDescribedBy,
        icon,
        ...rootProps
    } = props;
    return (
        <Root {...rootProps} {...slotPartProps(props, "root")}>
            <TouchTarget {...slotPartProps(props, "touchTarget")} />
            <Input
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                {...slotPartProps(props, "input")}
            />
            <Track {...slotPartProps(props, "track")}>
                <StateLayer {...slotPartProps(props, "stateLayer")} />
                <Handle {...slotPartProps(props, "handle")}>
                    {isPresent(icon) ? (
                        <Icon {...slotPartProps(props, "icon")}>{icon}</Icon>
                    ) : null}
                </Handle>
            </Track>
        </Root>
    );
}

/** Material's switch. Use it ready-made, `<Switch name="wifi" aria-label="Wi-Fi" />`, or compose
 *  its parts under `Switch.Root`: `TouchTarget`, `Input`, and `Track` holding `StateLayer` and
 *  `Handle` (with an optional `Icon`). */
export const Switch = Object.assign(ReadyMade, {
    Root,
    TouchTarget,
    Input,
    Track,
    StateLayer,
    Handle,
    Icon,
});

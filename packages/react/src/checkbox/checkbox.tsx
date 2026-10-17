// The checkbox: Root on Zag's checkbox machine, its parts as the preset draws them (a native input
// laid over the control, the box, and its two marks), and the ready-made Checkbox over them. The
// binding owns the form reset and the fieldset rule rather than Zag.

import { checkboxAnatomy } from "@pureform/anatomy";
import {
    CHECKBOX_ROOT_PROPS,
    checkboxInputProps,
    checkboxMachineProps,
    checkboxMarkProps,
    checkboxNativeDefault,
    checkboxResetState,
    checkboxSelection,
} from "@pureform/binding-core";
import type {
    CheckboxRootOwnProps,
    CheckedState,
} from "@pureform/binding-core";
import { syncCheckedInput } from "@pureform/binding-core/dom";
import * as checkbox from "@pureform/machines/checkbox";
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

type Anatomy = typeof checkboxAnatomy;

/** What Root shares with its parts. */
interface CheckboxContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: checkbox.Api<PropTypes>;
    readonly readOnly: boolean | undefined;
    readonly setInput: (input: HTMLInputElement | null) => void;
    /** Puts the input back to the controlled value after a click; see `Input`. Stable. */
    readonly restoreInput: (input: HTMLInputElement) => void;
}

const context = createPartContext<CheckboxContextValue>("Checkbox");

/** Root's props: the variants and tokens, the machine's props (`checked`, `disabled`, `name`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface CheckboxRootProps
    extends Omit<PartProps, keyof CheckboxRootOwnProps>, CheckboxRootOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface CheckboxPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The checkbox's root: a `<label>` around the native input, so its touch target toggles it. */
function Root(props: CheckboxRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const checked = useControllable("Checkbox", "checked", props);
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(input);
    const interaction = useOwnInteractionSource();
    const service = useMachine(checkbox.machine, {
        id,
        ...interaction,
        dir,
        ...checkboxMachineProps(props, fieldsetDisabled),
        ...checked.machineProps,
    });
    const api = checkbox.connect(service, normalizeProps);
    useFormReset(input, {
        resetsTo: checkboxNativeDefault(checked.resetsTo),
        onBeforeReset: checked.beforeReset,
        onReset: () =>
            checked.reset(() =>
                service.send({
                    type: "CHECKED.SET",
                    checked: checkboxResetState(checked.defaultValue),
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
    const scope = useComponent(checkboxAnatomy, {
        selection: checkboxSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, CHECKBOX_ROOT_PROPS);
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
function TouchTarget({ unstyled, ...props }: CheckboxPartProps): ReactNode {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", { element: "span", unstyled, props });
}

/** The native checkbox, invisible over the control: it takes every interaction, submits with the
 *  form, and is what assistive technology reads, so name it here (`aria-label`). */
function Input({ unstyled, ...props }: CheckboxPartProps): ReactNode {
    const { scope, api, readOnly, setInput, restoreInput } =
        context.use("Input");
    // The browser toggles the input on a click before the machine hears of it. Once the machine
    // has sent the change (a microtask) and told the owner, a controlled input is put back to the
    // value last committed; the owner's update, if any, then moves it with the machine. An
    // uncontrolled input already shows the machine's new state.
    const onClick = (event: MouseEvent<HTMLInputElement>) => {
        const element = event.currentTarget;
        queueMicrotask(() => restoreInput(element));
    };
    return scope.render("input", {
        element: "input",
        machine: combinePartProps([
            checkboxInputProps(api.getHiddenInputProps(), readOnly),
            { onClick },
        ]),
        ref: setInput as (element: HTMLElement | null) => void,
        unstyled,
        props,
    });
}

/** The box that holds both marks, hidden from assistive technology. */
function Box({ unstyled, ...props }: CheckboxPartProps): ReactNode {
    const { scope, api } = context.use("Box");
    return scope.render("box", {
        element: "span",
        machine: api.getControlProps(),
        unstyled,
        props,
    });
}

/** The check mark, which the CSS draws and shows when checked. Empty. */
function CheckIcon({ unstyled, ...props }: CheckboxPartProps): ReactNode {
    const { scope, api } = context.use("CheckIcon");
    return scope.render("checkIcon", {
        element: "span",
        machine: checkboxMarkProps(api.getIndicatorProps()),
        unstyled,
        props,
    });
}

/** The dash, which the CSS draws and shows when indeterminate. Empty. */
function IndeterminateIcon({
    unstyled,
    ...props
}: CheckboxPartProps): ReactNode {
    const { scope, api } = context.use("IndeterminateIcon");
    return scope.render("indeterminateIcon", {
        element: "span",
        machine: checkboxMarkProps(api.getIndicatorProps()),
        unstyled,
        props,
    });
}

/** The ready-made checkbox's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part. `aria-label`, `aria-labelledby`, and `aria-describedby` go on the input. */
export interface CheckboxProps
    extends
        Omit<CheckboxRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy> {}

/** The ready-made checkbox: every part, in the preset's structure. */
function ReadyMade(props: CheckboxProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        "aria-label": ariaLabel,
        "aria-labelledby": ariaLabelledBy,
        "aria-describedby": ariaDescribedBy,
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
            <Box {...slotPartProps(props, "box")}>
                <CheckIcon {...slotPartProps(props, "checkIcon")} />
                <IndeterminateIcon
                    {...slotPartProps(props, "indeterminateIcon")}
                />
            </Box>
        </Root>
    );
}

/** Material's checkbox. Use it ready-made, `<Checkbox name="terms" aria-label="Terms" />`, or
 *  compose its parts under `Checkbox.Root`: `TouchTarget`, `Input`, and `Box` holding `CheckIcon`
 *  and `IndeterminateIcon`. */
export const Checkbox = Object.assign(ReadyMade, {
    Root,
    TouchTarget,
    Input,
    Box,
    CheckIcon,
    IndeterminateIcon,
});

export type { CheckedState };

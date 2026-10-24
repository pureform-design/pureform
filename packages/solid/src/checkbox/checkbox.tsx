// The checkbox: Root on Zag's checkbox machine, its parts as the preset draws them (a native input
// laid over the control, the box, and its two marks), and the ready-made Checkbox over them. The
// binding owns the form reset and the fieldset rule rather than Zag.

import { checkboxAnatomy } from "@pureform/anatomy";
import {
    CHECKBOX_INPUT_LABEL_PROPS,
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
import { syncCheckedInput } from "@pureform/binding-dom";
import * as checkbox from "@pureform/machines/checkbox";
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
import { useFieldsetDisabled, useFormReset } from "../form";
import { useOwnInteractionSource } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof checkboxAnatomy;

/** What Root shares with its parts. */
interface CheckboxContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<checkbox.Api<PropTypes>>;
    readonly readOnly: Accessor<boolean | undefined>;
    readonly setInput: (input: HTMLInputElement) => void;
}

const context = createPartContext<CheckboxContextValue>("Checkbox");

/** Root's props: the variants and tokens, the machine's props (`checked`, `disabled`, `name`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface CheckboxRootProps
    extends Omit<PartProps, keyof CheckboxRootOwnProps>, CheckboxRootOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface CheckboxPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The checkbox's root: a `<label>` around the native input, so its touch target toggles it. */
function Root(props: CheckboxRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const checked = useControllable("Checkbox", "checked", props);
    const [input, setInput] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const fieldsetDisabled = useFieldsetDisabled(input);
    const source = useOwnInteractionSource(() => props.interactionSource);
    const service = useMachine(checkbox.machine, () => ({
        id,
        interactionSource: source(),
        dir: dir(),
        ...checkboxMachineProps(props, fieldsetDisabled()),
        ...checked.machineProps(),
    }));
    const api = createMemo(() => checkbox.connect(service, normalizeProps));
    useFormReset(input, {
        resetsTo: () => checkboxNativeDefault(checked.resetsTo()),
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
    const scope = useComponent(checkboxAnatomy, {
        selection: () => checkboxSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
        interactionSource: source,
    });
    return (
        <context.Provider
            value={{
                scope,
                api,
                readOnly: () => props.readOnly,
                setInput,
            }}
        >
            {scope.render("root", {
                element: "label",
                as: () => props.as,
                machine: () => api().getRootProps(),
                states: () => ({
                    pressed: service.context.get("active") as boolean,
                }),
                props: omit(props, "as", ...CHECKBOX_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The 48px touch target around the control. Empty. */
function TouchTarget(props: CheckboxPartProps): JSX.Element {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The native checkbox, invisible over the control: it takes every interaction, submits with the
 *  form, and is what assistive technology reads, so name it here (`aria-label`). */
function Input(props: CheckboxPartProps): JSX.Element {
    const { scope, api, readOnly, setInput } = context.use("Input");
    // The browser toggles the input on a click before the machine hears of it. Once the machine
    // has sent the change (a microtask) and the owner's update has applied, the input is put back
    // to the machine's state, so a controlled checkbox the owner didn't change doesn't move.
    const onClick = (event: MouseEvent) => {
        const input = event.currentTarget as HTMLInputElement;
        queueMicrotask(() => {
            flush();
            syncCheckedInput(
                input,
                untrack(() => api().checkedState),
            );
        });
    };
    return scope.render("input", {
        element: "input",
        machine: () =>
            combinePartProps([
                checkboxInputProps(api().getHiddenInputProps(), readOnly()),
                { onClick },
            ]),
        ref: (element) => setInput(element as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The box that holds both marks, hidden from assistive technology. */
function Box(props: CheckboxPartProps): JSX.Element {
    const { scope, api } = context.use("Box");
    return scope.render("box", {
        element: "span",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The check mark, which the CSS draws and shows when checked. Empty. */
function CheckIcon(props: CheckboxPartProps): JSX.Element {
    const { scope, api } = context.use("CheckIcon");
    return scope.render("checkIcon", {
        element: "span",
        machine: () => checkboxMarkProps(api().getIndicatorProps()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The dash, which the CSS draws and shows when indeterminate. Empty. */
function IndeterminateIcon(props: CheckboxPartProps): JSX.Element {
    const { scope, api } = context.use("IndeterminateIcon");
    return scope.render("indeterminateIcon", {
        element: "span",
        machine: () => checkboxMarkProps(api().getIndicatorProps()),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made checkbox's props: Root's, with `class`, `style`, and `slotProps` keyed by part.
 *  `aria-label`, `aria-labelledby`, and `aria-describedby` go on the input. */
export interface CheckboxProps
    extends
        Omit<CheckboxRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...CHECKBOX_INPUT_LABEL_PROPS,
] as const;

/** The ready-made checkbox: every part, in the preset's structure. */
function ReadyMade(props: CheckboxProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as CheckboxRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    const touchTarget = slots("touchTarget");
    const input = slots("input");
    const box = slots("box");
    const checkIcon = slots("checkIcon");
    const indeterminateIcon = slots("indeterminateIcon");
    return (
        <Root {...own} {...root}>
            <TouchTarget {...touchTarget} />
            <Input
                aria-label={props["aria-label"]}
                aria-labelledby={props["aria-labelledby"]}
                aria-describedby={props["aria-describedby"]}
                {...input}
            />
            <Box {...box}>
                <CheckIcon {...checkIcon} />
                <IndeterminateIcon {...indeterminateIcon} />
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

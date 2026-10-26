// The switch: Root on Zag's switch machine, its parts as the preset draws them (a native checkbox
// with `role="switch"` laid over the track, the state layer and handle inside the track, and an
// optional icon in the handle), and the ready-made Switch over them. The binding owns the form
// reset and the fieldset rule rather than Zag.

import { switchControlAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    SWITCH_CONTENT_PROPS,
    SWITCH_INPUT_LABEL_PROPS,
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
import { syncCheckedInput } from "@pureform/binding-web";
import * as switchControl from "@pureform/machines/switch";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    flush,
    omit,
    Show,
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

type Anatomy = typeof switchControlAnatomy;

/** What Root shares with its parts. */
interface SwitchContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<switchControl.Api<PropTypes>>;
    readonly readOnly: Accessor<boolean | undefined>;
    readonly setInput: (input: HTMLInputElement) => void;
}

const context = createPartContext<SwitchContextValue>("Switch");

/** Root's props: the variants and tokens, the machine's props (`checked`, `disabled`, `name`,
 *  …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface SwitchRootProps
    extends Omit<PartProps, keyof SwitchRootOwnProps>, SwitchRootOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SwitchPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The switch's root: a `<label>` around the native input, so its touch target toggles it. */
function Root(props: SwitchRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const checked = useControllable("Switch", "checked", props);
    const [input, setInput] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const fieldsetDisabled = useFieldsetDisabled(input);
    const source = useOwnInteractionSource(() => props.interactionSource);
    const service = useMachine(switchControl.machine, () => ({
        id,
        interactionSource: source(),
        dir: dir(),
        ...switchMachineProps(props, fieldsetDisabled()),
        ...checked.machineProps(),
    }));
    const api = createMemo(() =>
        switchControl.connect(service, normalizeProps),
    );
    useFormReset(input, {
        resetsTo: () => switchNativeDefault(checked.resetsTo()),
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
    const scope = useComponent(switchControlAnatomy, {
        selection: () => switchSelection(props),
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
                props: omit(props, "as", ...SWITCH_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The 48px touch target around the control. Empty. */
function TouchTarget(props: SwitchPartProps): JSX.Element {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The native checkbox with `role="switch"`, invisible over the track: it takes every
 *  interaction, submits with the form, and is what assistive technology reads, so name it here
 *  (`aria-label`). */
function Input(props: SwitchPartProps): JSX.Element {
    const { scope, api, readOnly, setInput } = context.use("Input");
    // The browser toggles the input on a click before the machine hears of it. Once the machine
    // has sent the change and the owner's update has applied, the input is put back to the
    // machine's state, so a controlled switch the owner didn't change doesn't move.
    const onClick = (event: MouseEvent) => {
        const input = event.currentTarget as HTMLInputElement;
        queueMicrotask(() => {
            flush();
            syncCheckedInput(
                input,
                untrack(() => api().checked),
            );
        });
    };
    return scope.render("input", {
        element: "input",
        machine: () =>
            combinePartProps([
                switchInputProps(api().getHiddenInputProps(), readOnly()),
                { onClick },
            ]),
        ref: (element) => setInput(element as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The track, which holds the state layer and the handle, hidden from assistive technology. */
function Track(props: SwitchPartProps): JSX.Element {
    const { scope, api } = context.use("Track");
    return scope.render("track", {
        element: "span",
        machine: () => api().getControlProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The circle behind the handle that shows hover, focus, and press. Empty. */
function StateLayer(props: SwitchPartProps): JSX.Element {
    const { scope } = context.use("StateLayer");
    return scope.render("stateLayer", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The handle, which slides along the track and grows when on. */
function Handle(props: SwitchPartProps): JSX.Element {
    const { scope, api } = context.use("Handle");
    return scope.render("handle", {
        element: "span",
        machine: () => api().getThumbProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The handle's icon, shown while the switch is on. Render it only when there's an icon. */
function Icon(props: SwitchPartProps): JSX.Element {
    const { scope } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made switch's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and the handle's icon. `aria-label`, `aria-labelledby`, and `aria-describedby` go on the
 *  input. */
export interface SwitchProps
    extends
        Omit<SwitchRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SwitchContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...SWITCH_INPUT_LABEL_PROPS,
    ...SWITCH_CONTENT_PROPS,
] as const;

/** The ready-made switch: every part, in the preset's structure; the icon only when given. */
function ReadyMade(props: SwitchProps): JSX.Element {
    const hasIcon = createMemo(() => isPresent(props.icon));
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as SwitchRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    const touchTarget = slots("touchTarget");
    const input = slots("input");
    const track = slots("track");
    const stateLayer = slots("stateLayer");
    const handle = slots("handle");
    const icon = slots("icon");
    return (
        <Root {...own} {...root}>
            <TouchTarget {...touchTarget} />
            <Input
                aria-label={props["aria-label"]}
                aria-labelledby={props["aria-labelledby"]}
                aria-describedby={props["aria-describedby"]}
                {...input}
            />
            <Track {...track}>
                <StateLayer {...stateLayer} />
                <Handle {...handle}>
                    <Show when={hasIcon()}>
                        <Icon {...icon}>{props.icon}</Icon>
                    </Show>
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

import type {
    InteractionState,
    PointerKind,
    PressOrigin,
} from "@pureform/binding-core/interaction";
import type { Machine, Service } from "@zag-js/core";
import type {
    CommonProperties,
    DirectionProperty,
    PropTypes,
    RequiredBy,
} from "@zag-js/types";

import type { InteractionEmitter, InteractionProps } from "../interaction";

export interface SelectedChangeDetails {
    selected: boolean;
}

export interface ElementIds {
    root?: string | undefined;
    label?: string | undefined;
}

export interface ButtonProps
    extends DirectionProperty, CommonProperties, InteractionProps {
    /** The ids of the elements in the button. Useful for composition. */
    ids?: ElementIds | undefined;
    /** Whether the button is disabled. A disabled fieldset around it disables it too. */
    disabled?: boolean | undefined;
    /** The native button type. @default "button" */
    type?: "button" | "submit" | "reset" | undefined;
    /** The name the button submits its value under when it submits the form. */
    name?: string | undefined;
    /** The value the button submits when it submits the form. */
    value?: string | undefined;
    /** The id of the form the button belongs to, for a button outside it. */
    form?: string | undefined;
    /** Whether a press toggles the selected state, which `aria-pressed` reports.
     *  @default true when `selected` or `defaultSelected` is set, else false */
    toggle?: boolean | undefined;
    /** The controlled selected state of a toggle button. */
    selected?: boolean | undefined;
    /** The selected state a toggle button starts with, when `selected` isn't controlled. */
    defaultSelected?: boolean | undefined;
    /** Called when the user toggles the button, with the state it asks for. */
    onSelectedChange?: ((details: SelectedChangeDetails) => void) | undefined;
}

type PropsWithDefault = "type" | "toggle" | "defaultSelected";

/** How a press started: a pointer, or Enter or Space on the focused button. */
export type PressSource = "pointer" | "keyboard";

export type ButtonEvent =
    | {
          type: "PRESS.START";
          source: PressSource;
          origin: PressOrigin;
          pointer: PointerKind;
      }
    | { type: "PRESS.END" }
    | { type: "PRESS.CANCEL" }
    | { type: "BLUR" }
    | { type: "SELECTED.TOGGLE" }
    | { type: "SELECTED.SET"; selected: boolean }
    | { type: "CONTEXT.SET"; context: { focused?: boolean } };

export interface ButtonSchema {
    state: "idle" | "pressed";
    props: RequiredBy<ButtonProps, PropsWithDefault>;
    context: {
        selected: boolean;
        focused: boolean;
        fieldsetDisabled: boolean;
        /** The interaction source's state, kept in step with it while the machine runs. */
        interaction: InteractionState;
    };
    refs: {
        pressSource: PressSource | null;
        /** Emits to `interactionSource`, or to a source of the machine's own without one. */
        interaction: InteractionEmitter;
        /** Stops following the source the state was last read from. */
        unfollowSource: (() => void) | null;
    };
    computed: {
        disabled: boolean;
    };
    event: ButtonEvent;
    action: string;
    effect: string;
    guard: string;
}

export type ButtonService = Service<ButtonSchema>;
export type ButtonMachine = Machine<ButtonSchema>;

export interface ButtonApi<T extends PropTypes = PropTypes> {
    /** Whether the button's interaction source is pressed: a pointer is down on it, Enter or
     *  Space is held, or a press came from another component sharing the source. */
    pressed: boolean;
    /** Whether the button has focus. */
    focused: boolean;
    /** Whether the button's interaction source has focus the browser would show a focus ring
     *  for. */
    focusVisible: boolean;
    /** Whether the button's interaction source is hovered, by a mouse or pen. */
    hovered: boolean;
    /** Whether the button is disabled, by its prop or a disabled fieldset. */
    disabled: boolean;
    /** Whether a press toggles the selected state. */
    toggle: boolean;
    /** Whether a toggle button is selected. Always false for other buttons. */
    selected: boolean;
    /** Ask for a toggle button's selected state, as a user action would. */
    setSelected: (selected: boolean) => void;
    /** Toggle a toggle button's selected state, as a press would. */
    toggleSelected: VoidFunction;
    getRootProps: () => T["button"];
    getLabelProps: () => T["element"];
    getIconProps: () => T["element"];
}

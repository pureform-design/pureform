import type { Machine, Service } from "@zag-js/core";
import type {
    CommonProperties,
    DirectionProperty,
    PropTypes,
    RequiredBy,
} from "@zag-js/types";

export interface SelectedChangeDetails {
    selected: boolean;
}

export interface ElementIds {
    root?: string | undefined;
    label?: string | undefined;
}

export interface ButtonProps extends DirectionProperty, CommonProperties {
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
    | { type: "PRESS.START"; source: PressSource }
    | { type: "PRESS.END" }
    | { type: "PRESS.CANCEL" }
    | { type: "BLUR" }
    | { type: "SELECTED.TOGGLE" }
    | { type: "SELECTED.SET"; selected: boolean }
    | { type: "CONTEXT.SET"; context: Partial<InteractionContext> };

export interface InteractionContext {
    focused: boolean;
    focusVisible: boolean;
    hovered: boolean;
}

export interface ButtonSchema {
    state: "idle" | "pressed";
    props: RequiredBy<ButtonProps, PropsWithDefault>;
    context: InteractionContext & {
        selected: boolean;
        fieldsetDisabled: boolean;
    };
    refs: {
        pressSource: PressSource | null;
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
    /** Whether the button is pressed: a pointer is down on it, or Enter or Space is held. */
    pressed: boolean;
    /** Whether the button has focus. */
    focused: boolean;
    /** Whether the button has focus the browser would show a focus ring for. */
    focusVisible: boolean;
    /** Whether a mouse or pen hovers the button. */
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

import type { Machine, Service } from "@zag-js/core";
import type {
    CommonProperties,
    DirectionProperty,
    PropTypes,
    RequiredBy,
} from "@zag-js/types";

export interface ValueChangeDetails {
    value: number;
}

export interface ElementIds {
    root?: string | undefined;
    input?: string | undefined;
}

export interface SliderProps extends DirectionProperty, CommonProperties {
    /** The ids of the elements in the slider. Useful for composition. */
    ids?: ElementIds | undefined;
    /** The controlled value. */
    value?: number | undefined;
    /** The value the slider starts with, and resets to, when `value` isn't controlled.
     *  @default min */
    defaultValue?: number | undefined;
    /** Called when the user changes the value, with the value it asks for. */
    onValueChange?: ((details: ValueChangeDetails) => void) | undefined;
    /** @default 0 */
    min?: number | undefined;
    /** @default 100 */
    max?: number | undefined;
    /** @default 1 */
    step?: number | undefined;
    disabled?: boolean | undefined;
    readOnly?: boolean | undefined;
    invalid?: boolean | undefined;
    /** The name the input submits its value under. */
    name?: string | undefined;
    /** The id of the form the input belongs to, for a slider outside it. */
    form?: string | undefined;
}

type PropsWithDefault = "min" | "max" | "step" | "defaultValue";

export interface SliderSchema {
    state: "idle";
    props: RequiredBy<SliderProps, PropsWithDefault>;
    context: {
        value: number;
        fieldsetDisabled: boolean;
    };
    computed: {
        disabled: boolean;
        /** The value as a fraction of the range, 0 to 1, for the active track's token. */
        fraction: number;
    };
    event: { type: string; [key: string]: unknown };
    action: string;
    effect: string;
    guard: string;
}

export type SliderService = Service<SliderSchema>;
export type SliderMachine = Machine<SliderSchema>;

export interface SliderApi<T extends PropTypes = PropTypes> {
    value: number;
    /** The value as a fraction of the range, 0 to 1. */
    fraction: number;
    disabled: boolean;
    setValue: (value: number) => void;
    getRootProps: () => T["element"];
    /** The native `<input type="range">` that takes every interaction. */
    getInputProps: () => T["input"];
}

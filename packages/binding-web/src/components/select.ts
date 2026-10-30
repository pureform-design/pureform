import { fromSelectList, toSelectList } from "@pureform/binding-core";
import type { ChangeDetails, SelectValue } from "@pureform/binding-core";

import { presentProps } from "./layout";

/** Zag's value (a list) from the select's (one value, `null`, or an array). */
export const toZagValue = (
    value: SelectValue | undefined,
): string[] | undefined => toSelectList(value);
/** The select's value from Zag's: the first or `null`, or with `multiple` the array. */
export const fromZagValue = (
    value: readonly string[],
    multiple?: boolean,
): SelectValue => fromSelectList(value, multiple);
/** The controllable `value`'s machine props in Zag's shape: lists for the value and default, and
 *  the callback given the select's value. `controllable` is `useControllable`'s machine props. */
export const selectValueProps = <V extends SelectValue>(
    controllable: {
        readonly value: V | undefined;
        readonly defaultValue: V | undefined;
        readonly onValueChange: (details: ChangeDetails<"value", V>) => void;
    },
    multiple?: boolean,
) => ({
    value: toZagValue(controllable.value),
    defaultValue: toZagValue(controllable.defaultValue),
    onValueChange: (details: { value: string[] }) =>
        controllable.onValueChange({
            value: fromZagValue(details.value, multiple) as V,
        }),
});
const SIDEWAYS: Readonly<Record<string, string>> = {
    ArrowLeft: "ArrowRight",
    ArrowRight: "ArrowLeft",
};
const swapSideways = <E extends object>(event: E): E =>
    new Proxy(event, {
        get(target, property) {
            if (property === "key") {
                const key = (target as { key?: string }).key ?? "";
                return SIDEWAYS[key] ?? key;
            }
            const value = Reflect.get(target, property, target) as unknown;
            return typeof value === "function" ? value.bind(target) : value;
        },
    });
/** Zag's trigger props for the `input` part, a read-only `<input>` the preset draws as the field:
 *  no `type="button"`, the value's label as its value, and a placeholder of one space so the
 *  label floats once there's a value. Under `rtl` the sideways arrow keys swap, so the one
 *  pointing back chooses the option before, as in any other direction-aware control (Zag's
 *  select reads them by the list's vertical orientation, which doesn't flip). */
export const selectInputProps = <P extends object>(
    props: P,
    valueText: string,
    dir: "ltr" | "rtl" | undefined,
): Omit<P, "type"> & {
    readonly readOnly: true;
    readonly value: string;
    readonly placeholder: " ";
    readonly autoComplete: "off";
} => {
    const { type: _type, ...rest } = props as P & {
        type?: unknown;
        onKeyDown?: (event: object) => void;
    };
    const onKeyDown = (rest as { onKeyDown?: (event: object) => void })
        .onKeyDown;
    return {
        ...rest,
        ...(dir === "rtl" && onKeyDown
            ? { onKeyDown: (event: object) => onKeyDown(swapSideways(event)) }
            : {}),
        readOnly: true,
        value: valueText,
        placeholder: " ",
        autoComplete: "off",
    };
};
/** Zag's positioner props, hidden once the list is gone (closed, and its exit animation over), so
 *  the closed list takes no room in the layout or the page's measurements. */
export const selectPositionerProps = presentProps;
/** Zag's hidden-select props, without `aria-labelledby` (it's hidden from assistive technology
 *  anyway) and with the visually hidden style kept. */
export const selectHiddenSelectProps = <P extends object>(
    props: P,
): Omit<P, "aria-labelledby"> => {
    const { "aria-labelledby": _labelledBy, ...rest } = props as P & {
        "aria-labelledby"?: unknown;
    };
    return rest;
};

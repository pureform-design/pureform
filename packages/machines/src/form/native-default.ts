/** A component's `default*` value, in any shape a native control resets to. */
export type NativeDefault =
    | boolean
    | string
    | number
    | readonly string[]
    | null
    | undefined;

const toValues = (value: NativeDefault): string[] => {
    if (Array.isArray(value)) return [...value];
    if (value === null || value === undefined || typeof value === "boolean")
        return [];
    return [String(value)];
};

/**
 * Set what a native control resets to, from a component's `default*` prop rather than its
 * current state: `defaultChecked` on a checkbox or radio (checked when `value` is `true`),
 * `defaultValue` on other inputs and text areas, and `defaultSelected` on a select's options
 * (each option whose value is in `value`). Anything else is left alone.
 */
export function setNativeDefault(
    element: Element | null | undefined,
    value: NativeDefault,
): void {
    if (!element) return;
    switch (element.localName) {
        case "input": {
            const input = element as HTMLInputElement;
            if (input.type === "checkbox" || input.type === "radio") {
                input.defaultChecked = value === true;
            } else {
                input.defaultValue = toValues(value)[0] ?? "";
            }
            return;
        }
        case "textarea":
            (element as HTMLTextAreaElement).defaultValue =
                toValues(value)[0] ?? "";
            return;
        case "select": {
            const values = new Set(toValues(value));
            for (const option of (element as HTMLSelectElement).options) {
                option.defaultSelected = values.has(option.value);
            }
            return;
        }
    }
}

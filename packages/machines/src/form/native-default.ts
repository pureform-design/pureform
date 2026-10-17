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

// A text control the user hasn't edited shows its default, so writing the default alone would
// change what it shows.
const writeTextDefault = (
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string,
) => {
    if (element.defaultValue === value) return;
    const shown = element.value;
    element.defaultValue = value;
    if (element.value !== shown) element.value = shown;
};

/**
 * Set what a native control resets to, from a component's `default*` prop rather than its
 * current state: `defaultChecked` on a checkbox or radio (checked when `value` is `true`),
 * `defaultValue` on other inputs and text areas, and `defaultSelected` on a select's options
 * (each option whose value is in `value`). Anything else is left alone. The control keeps the
 * value it shows: a text input or select the user hasn't changed would otherwise follow its new
 * default.
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
                writeTextDefault(input, toValues(value)[0] ?? "");
            }
            return;
        }
        case "textarea":
            writeTextDefault(
                element as HTMLTextAreaElement,
                toValues(value)[0] ?? "",
            );
            return;
        case "select": {
            const select = element as HTMLSelectElement;
            const values = new Set(toValues(value));
            const shown = [...select.options].map((option) => option.selected);
            for (const option of select.options) {
                option.defaultSelected = values.has(option.value);
            }
            if (!shown.includes(true)) select.selectedIndex = -1;
            else
                [...select.options].forEach((option, index) => {
                    if (option.selected !== shown[index])
                        option.selected = shown[index]!;
                });
            return;
        }
    }
}

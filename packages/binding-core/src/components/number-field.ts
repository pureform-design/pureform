// The number field's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection and Zag's number input machine, what the ready-made component renders,
// and the arithmetic React Native runs without Zag (parsing and formatting in the locale,
// stepping, clamping, and the press-and-hold repeat's timing).
//
// It's a text field for a number with a decrement and an increment button at its end; Material
// has no number field, so it's pureform's own (c9a). Not to be confused with `Stepper`, the
// step-by-step wizard.

import type {
    numberFieldAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The number field's parts: `"root" | "container" | "leadingIcon" | "prefixText" | "input" |
 *  "suffixText" | "label" | "control" | "decrementTrigger" | "incrementTrigger" |
 *  "supportingText"`. */
export type NumberFieldPart = PartName<typeof numberFieldAnatomy>;

/** The number field's variant groups and instance tokens. `leadingIcon`, `prefixText` and
 *  `suffixText` make room for what they name; the ready-made component sets them when it renders
 *  one. */
export interface NumberFieldVariantProps {
    readonly variant?: VariantProp<"numberField", "variant">;
    readonly color?: VariantProp<"numberField", "color">;
    readonly density?: VariantProp<"numberField", "density">;
    readonly leadingIcon?: boolean | undefined;
    readonly prefixText?: boolean | undefined;
    readonly suffixText?: boolean | undefined;
    readonly tokens?: InstanceTokens<"numberField"> | undefined;
}

/** What a value change reports: the text as shown (formatted in the locale) and the number it
 *  stands for (`NaN` while empty), as Zag's. The `value` and `defaultValue` props are text in the
 *  locale too: `"1.234,5"` under `de-DE`. */
export interface NumberFieldValueDetails {
    readonly value: string;
    readonly valueAsNumber: number;
}

/** What the number input machine takes from Root's props. */
export interface NumberFieldBehaviorProps extends Controllable<
    "value",
    string,
    NumberFieldValueDetails
> {
    /** The smallest value; a step stops there, and leaving the field clamps to it. */
    readonly min?: number | undefined;
    /** The largest value. */
    readonly max?: number | undefined;
    /** How far a button press or an arrow key steps. @default 1 */
    readonly step?: number | undefined;
    /** How far Shift with an arrow key, or Page Up and Page Down, steps. @default 10 */
    readonly largeStep?: number | undefined;
    /** Keep a value outside `min` and `max` (marked invalid) instead of clamping it on blur. */
    readonly allowOverflow?: boolean | undefined;
    /** Step with the mouse wheel while focused. */
    readonly allowMouseWheel?: boolean | undefined;
    /** Repeat while a button is held (after 300ms, every 50ms). @default true */
    readonly spinOnPress?: boolean | undefined;
    /** The locale the value is formatted and parsed in. @default "en-US" */
    readonly locale?: string | undefined;
    /** How the value is formatted: `Intl.NumberFormat`'s options (a currency, a percent, the
     *  fraction digits). @default `{ maximumFractionDigits: 20 }`, grouped in the locale.
     *  @control object */
    readonly formatOptions?: Intl.NumberFormatOptions | undefined;
    readonly disabled?: boolean | undefined;
    /** Marks the field invalid (`aria-invalid`), which the error look keys on. Without it, a
     *  value outside `min` and `max` is. */
    readonly invalid?: boolean | undefined;
    /** An error message: marks the field invalid and replaces the supporting text. */
    readonly error?: string | undefined;
    readonly required?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The input's placeholder. The label floats while it isn't shown, so the default is a single
     *  space. */
    readonly placeholder?: string | undefined;
    /** The name the value submits under.
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the value belongs to, for a field outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** The decrement button's accessible name. @default "decrease value" */
    readonly decrementLabel?: string | undefined;
    /** The increment button's accessible name. @default "increment value" */
    readonly incrementLabel?: string | undefined;
    /** The root element's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface NumberFieldRootOwnProps
    extends
        NumberFieldVariantProps,
        NumberFieldBehaviorProps,
        InteractiveProps {
    /** A prefix for every part's test id (`qty` → `qty-input`), or ids by part. */
    readonly testId?: TestIdOverride<NumberFieldPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<NumberFieldPart> | undefined;
}

/** The keys of `NumberFieldRootOwnProps`, which Root keeps off its element. */
export const NUMBER_FIELD_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "leadingIcon",
    "prefixText",
    "suffixText",
    "tokens",
    "min",
    "max",
    "step",
    "largeStep",
    "allowOverflow",
    "allowMouseWheel",
    "spinOnPress",
    "locale",
    "formatOptions",
    "disabled",
    "invalid",
    "error",
    "required",
    "readOnly",
    "placeholder",
    "name",
    "form",
    "decrementLabel",
    "incrementLabel",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof NumberFieldRootOwnProps)[];

/** What the ready-made number field renders inside Root, in the framework's node type. */
export interface NumberFieldContentProps<Node> {
    /** The floating label, also the input's accessible name. */
    readonly label?: Node;
    /** Helper text under the field; an error message takes its place. */
    readonly supportingText?: Node;
    /** An icon at the start of the field; renders only when given. */
    readonly leadingIcon?: Node;
    /** Flip the leading icon under `rtl`. */
    readonly mirrorLeadingIcon?: boolean | undefined;
    /** Text before the input, such as a currency sign; shows once the label floats. */
    readonly prefixText?: Node;
    /** Text after the input, such as a unit; shows once the label floats. */
    readonly suffixText?: Node;
    /** The decrement button's icon. @default a minus */
    readonly decrementIcon?: Node;
    /** The increment button's icon. @default a plus */
    readonly incrementIcon?: Node;
}

/** The keys of `NumberFieldContentProps`. */
export const NUMBER_FIELD_CONTENT_PROPS = [
    "label",
    "supportingText",
    "leadingIcon",
    "mirrorLeadingIcon",
    "prefixText",
    "suffixText",
    "decrementIcon",
    "incrementIcon",
] as const satisfies readonly (keyof NumberFieldContentProps<unknown>)[];

/** The number field's registry selection from Root's props. */
export const numberFieldSelection = (
    props: NumberFieldVariantProps,
): Selection<"numberField"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    leadingIcon: props.leadingIcon,
    prefixText: props.prefixText,
    suffixText: props.suffixText,
    tokens: props.tokens,
});

/** The locale a number field formats and parses in unless given one: Zag's. A fixed default
 *  rather than the browser's, so the server renders what the client hydrates. */
export const NUMBER_FIELD_LOCALE = "en-US";

/** How a number field formats unless given options: in the locale (its grouping and decimal
 *  separator), keeping every fraction digit typed. Zag formats and parses in the locale only
 *  with format options, so there are always some. */
export const NUMBER_FIELD_FORMAT: Intl.NumberFormatOptions = {
    maximumFractionDigits: 20,
};

/** The number input machine's props from Root's, besides `id`, `dir`, and the controllable
 *  `value` (the binding's `useControllable`). An error marks the field invalid. */
export const numberFieldMachineProps = (props: NumberFieldBehaviorProps) => ({
    min: props.min,
    max: props.max,
    step: props.step,
    largeStep: props.largeStep,
    allowOverflow: props.allowOverflow,
    allowMouseWheel: props.allowMouseWheel,
    spinOnPress: props.spinOnPress,
    locale: props.locale ?? NUMBER_FIELD_LOCALE,
    formatOptions: props.formatOptions ?? NUMBER_FIELD_FORMAT,
    disabled: props.disabled,
    invalid: props.error !== undefined ? true : props.invalid,
    required: props.required,
    readOnly: props.readOnly,
    name: props.name,
    form: props.form,
    translations: {
        ...(props.decrementLabel !== undefined
            ? { decrementLabel: props.decrementLabel }
            : {}),
        ...(props.incrementLabel !== undefined
            ? { incrementLabel: props.incrementLabel }
            : {}),
    },
});

/** The input's placeholder: the given one, else a single space so the label can float. */
export const numberFieldPlaceholder = (placeholder: string | undefined) =>
    placeholder ?? " ";

// React Native: no Zag machine, so the arithmetic is here.

/** How long a held button waits before it repeats, and how often it repeats then: Zag's. */
export const NUMBER_FIELD_SPIN_DELAY = 300;
export const NUMBER_FIELD_SPIN_INTERVAL = 50;

/** The accessible names Zag gives the buttons by default. */
export const NUMBER_FIELD_LABELS = {
    decrement: "decrease value",
    increment: "increment value",
} as const;

/** The limits and steps a number field works in, with Zag's defaults filled in. */
export interface NumberFieldRange {
    readonly min: number;
    readonly max: number;
    readonly step: number;
}

export const numberFieldRange = (props: {
    readonly min?: number | undefined;
    readonly max?: number | undefined;
    readonly step?: number | undefined;
}): NumberFieldRange => ({
    min: props.min ?? Number.MIN_SAFE_INTEGER,
    max: props.max ?? Number.MAX_SAFE_INTEGER,
    step: props.step ?? 1,
});

const decimals = (n: number): number => {
    const text = String(n);
    const at = text.indexOf(".");
    return at === -1 ? 0 : text.length - at - 1;
};

/** `value` clamped to the range. `NaN` stays `NaN`. */
export const numberFieldClamp = (value: number, range: NumberFieldRange) =>
    Number.isNaN(value)
        ? value
        : Math.min(range.max, Math.max(range.min, value));

/** One step up (`1`) or down (`-1`) from `value`, by `step` (the range's unless given), clamped.
 *  An empty value steps from the minimum when it's finite, else from 0, as Zag's. The result is
 *  rounded to the step's decimals, so `0.1 + 0.2` is `0.3`. */
export const numberFieldStep = (
    value: number,
    direction: 1 | -1,
    range: NumberFieldRange,
    step: number = range.step,
): number => {
    const from = Number.isNaN(value)
        ? range.min > Number.MIN_SAFE_INTEGER
            ? range.min
            : 0
        : value;
    const places = Math.max(decimals(step), decimals(from));
    const next = Number((from + direction * step).toFixed(places));
    return numberFieldClamp(next, range);
};

/** Whether a step in `direction` can still move. */
export const numberFieldCanStep = (
    value: number,
    direction: 1 | -1,
    range: NumberFieldRange,
): boolean =>
    Number.isNaN(value) ||
    (direction > 0 ? value < range.max : value > range.min);

/** `value` in `locale` with `options`; empty for `NaN`. */
export const numberFieldFormat = (
    value: number,
    locale = NUMBER_FIELD_LOCALE,
    options: Intl.NumberFormatOptions = NUMBER_FIELD_FORMAT,
): string =>
    Number.isNaN(value)
        ? ""
        : new Intl.NumberFormat(locale, options).format(value);

/** Text typed in `locale` as a number: the locale's group separators dropped, its decimal
 *  separator read as a point, and anything else that isn't a digit or a minus ignored (a currency
 *  sign, a percent sign, which `options.style: "percent"` divides by 100). `NaN` when there's no
 *  number in it. */
export const numberFieldParse = (
    text: string,
    locale = NUMBER_FIELD_LOCALE,
    options?: Intl.NumberFormatOptions,
): number => {
    const parts = new Intl.NumberFormat(locale, {
        ...options,
        useGrouping: true,
    }).formatToParts(-12345.6);
    const group = parts.find((part) => part.type === "group")?.value ?? ",";
    const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
    const minus = parts.find((part) => part.type === "minusSign")?.value ?? "-";
    let normalized = "";
    for (const char of text.trim()) {
        if (char === group || (group === "\u00a0" && char === " ")) continue;
        if (char === decimal) normalized += ".";
        else if (char === minus || char === "-" || char === "\u2212")
            normalized += normalized === "" ? "-" : "";
        else if (char >= "0" && char <= "9") normalized += char;
    }
    if (normalized === "" || normalized === "-" || normalized === ".")
        return Number.NaN;
    const number = Number(normalized);
    if (Number.isNaN(number)) return Number.NaN;
    return options?.style === "percent" ? number / 100 : number;
};

/** Whether a value lies outside the range: the field shows it as invalid. */
export const numberFieldOutOfRange = (
    value: number,
    range: NumberFieldRange,
): boolean => !Number.isNaN(value) && (value < range.min || value > range.max);

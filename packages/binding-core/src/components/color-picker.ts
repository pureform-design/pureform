// The color picker's contract, shared by every binding: an inline picker (Zag's color picker on
// the web, pureform's own drag code on React Native) with a saturation and brightness area, a hue
// slider, an optional alpha slider, the value's swatch beside a hex text field and the eye
// dropper, and preset swatches. The value is a CSS color string; the picker reports hex
// (`#rrggbb`, or `#rrggbbaa` when it isn't opaque), which pureform's runtime theme takes as a seed.

import type {
    colorPickerAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";

/** The color picker's parts: `"root" | "label" | "content" | "area" | "areaBackground" |
 *  "areaThumb" | "channelSlider" | "transparencyGrid" | "channelSliderTrack" |
 *  "channelSliderThumb" | "control" | "valueSwatch" | "swatchGroup" | "swatchTrigger" |
 *  "swatch"`. */
export type ColorPickerPart = PartName<typeof colorPickerAnatomy>;

/** The channel a slider moves. */
export type ColorPickerChannel = "hue" | "alpha";

/** What a value change reports: the value as hex (`#rrggbb`, or `#rrggbbaa` when not opaque). */
export interface ColorPickerValueDetails {
    readonly value: string;
}

/** The value the picker starts at when it's given none: Material's baseline seed. */
export const COLOR_PICKER_DEFAULT = "#6750a4";

/** The color picker's instance tokens (it has no variants). */
export interface ColorPickerVariantProps {
    readonly tokens?: InstanceTokens<"colorPicker"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ColorPickerRootOwnProps extends ColorPickerVariantProps {
    /** The color, controlled: any CSS color Zag reads (`#6750a4`, `rgb(…)`, `hsl(…)`).
     *  @control color */
    readonly value?: string | undefined;
    /** The color to start with. @default "#6750a4"
     *  @control none */
    readonly defaultValue?: string | undefined;
    /** Called as the color changes, while dragging too. */
    readonly onValueChange?:
        | ((details: ColorPickerValueDetails) => void)
        | undefined;
    /** Called when a drag, a key, a swatch or the text field settles on a color. */
    readonly onValueChangeEnd?:
        | ((details: ColorPickerValueDetails) => void)
        | undefined;
    readonly disabled?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The form field's name; a hidden input holds the value. */
    readonly name?: string | undefined;
    /** Root's id, also the machine's.
     *  @control none */
    readonly id?: string | undefined;
    /** A test id for Root, or ids by part. */
    readonly testId?: TestIdOverride<ColorPickerPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ColorPickerPart> | undefined;
}

/** The keys of `ColorPickerRootOwnProps`, which Root keeps off its element. */
export const COLOR_PICKER_ROOT_PROPS = [
    "tokens",
    "value",
    "defaultValue",
    "onValueChange",
    "onValueChangeEnd",
    "disabled",
    "readOnly",
    "name",
    "id",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof ColorPickerRootOwnProps)[];

/** What the ready-made picker renders inside Root, in the framework's node type. */
export interface ColorPickerContentProps<Node> {
    /** The picker's label, above it. */
    readonly label?: Node;
    /** Show the saturation and brightness area. @default true */
    readonly area?: boolean | undefined;
    /** Show the alpha slider. @default false */
    readonly alpha?: boolean | undefined;
    /** Preset colors to pick from, below the field. */
    readonly swatches?: readonly string[] | undefined;
    /** The hex text field's label. @default "Hex" */
    readonly inputLabel?: string | undefined;
    /** Show the eye dropper where the platform has one (Chromium's `EyeDropper`). @default true */
    readonly eyeDropper?: boolean | undefined;
    /** The eye dropper's name, for assistive technology. @default "Pick a color from the screen" */
    readonly eyeDropperLabel?: string | undefined;
}

/** The registry selection from Root's props. */
export const colorPickerSelection = (
    props: ColorPickerVariantProps,
): Selection<"colorPicker"> => ({ tokens: props.tokens });

const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** The hex color a text field's text names, normalised to `#rrggbb` (or `#rrggbbaa` when not
 *  opaque), or `undefined` when it isn't one. Three and four digits expand; `#` is optional. */
export const colorPickerHex = (text: string): string | undefined => {
    const match = HEX.exec(text.trim());
    if (!match) return undefined;
    let digits = match[1]!.toLowerCase();
    if (digits.length <= 4)
        digits = [...digits].map((digit) => digit + digit).join("");
    if (digits.length === 8 && digits.endsWith("ff"))
        digits = digits.slice(0, 6);
    return `#${digits}`;
};

/** The text a hex field shows for a value: without its `#`, upper case. */
export const colorPickerHexText = (hex: string): string =>
    hex.replace(/^#/, "").toUpperCase();

/** A swatch trigger's name, for assistive technology. */
export const colorPickerSwatchLabel = (color: string): string =>
    `Select ${color}`;

/** Where a value along a slider or the area sits, 0 to 1, from a point `at` pixels along a
 *  `length`, clamped to the ends; `rtl` counts from the right. */
export const colorPickerFraction = (
    at: number,
    length: number,
    rtl = false,
): number => {
    if (length <= 0) return 0;
    const fraction = Math.min(1, Math.max(0, at / length));
    return rtl ? 1 - fraction : fraction;
};

/** The style that centres a slider's thumb on the point Zag places it at (`left` and
 *  `top: 50%`), on the web. */
export const COLOR_PICKER_THUMB_CENTRE = {
    transform: "translate(-50%, -50%)",
} as const;

/** Whether this browser has an eye dropper (Chromium's `EyeDropper`). Read it after mounting,
 *  so the server and the first render agree. */
export const hasEyeDropper = (): boolean =>
    typeof window !== "undefined" && "EyeDropper" in window;

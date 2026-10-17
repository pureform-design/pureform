// The text area: Material's filled and outlined multi-line field over a native `<textarea>`, on
// pureform's text field machine. Its parts and ready-made component come from `createTextInput`,
// which the text field shares.

import { textAreaAnatomy } from "@pureform/anatomy";
import {
    TEXT_AREA_INPUT_PROPS,
    TEXT_AREA_ROOT_PROPS,
    textAreaSelection,
} from "@pureform/binding-core";
import type {
    TextAreaRootOwnProps,
    TextFieldContentProps,
} from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";

import type { SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { createTextInput } from "../text-input";
import type { TextInputIconProps, TextInputPartProps } from "../text-input";

type Anatomy = typeof textAreaAnatomy;

/** The text area attributes the ready-made text area passes to it, in Solid's spelling. */
const SOLID_INPUT_PROPS = [
    "autocomplete",
    "autocapitalize",
    "autofocus",
    "enterkeyhint",
    "inputmode",
    "maxlength",
    "minlength",
    "spellcheck",
] as const;

type TextAreaAttributes = Pick<
    JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
    (typeof TEXT_AREA_INPUT_PROPS)[number] | (typeof SOLID_INPUT_PROPS)[number]
>;

/** Root's props: the variants (`autoGrow` too) and tokens, the machine's props (`value`, `error`,
 *  `name`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface TextAreaRootProps
    extends Omit<PartProps, keyof TextAreaRootOwnProps>, TextAreaRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type TextAreaPartProps = TextInputPartProps;

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export type TextAreaIconProps = TextInputIconProps;

/** The ready-made text area's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part, the label, supporting text, and icons as content, and the text area's attributes
 *  (`rows`, `maxlength`, `aria-label`, …), which go on it. */
export interface TextAreaProps
    extends
        Omit<
            TextAreaRootProps,
            | keyof SlotKeyedProps<Anatomy>
            | "children"
            | "leadingIcon"
            | "trailingIcon"
            | keyof TextAreaAttributes
        >,
        SlotKeyedProps<Anatomy>,
        TextFieldContentProps<JSX.Element>,
        TextAreaAttributes {}

const { ReadyMade, parts } = createTextInput({
    component: "TextArea",
    anatomy: textAreaAnatomy,
    element: "textarea",
    rootProps: TEXT_AREA_ROOT_PROPS,
    inputProps: [...TEXT_AREA_INPUT_PROPS, ...SOLID_INPUT_PROPS],
    selection: textAreaSelection,
});

/** Material's text area. Use it ready-made, `<TextArea label="Bio" name="bio" rows={3} />`, or
 *  compose its parts under `TextArea.Root`, as the text field's. */
export const TextArea = Object.assign(
    ReadyMade as (props: TextAreaProps) => JSX.Element,
    parts as Omit<typeof parts, "Root"> & {
        Root: (props: TextAreaRootProps) => JSX.Element;
    },
);

// The text field: Material's filled and outlined single-line field over a native `<input>`, on
// pureform's text field machine. Its parts and ready-made component come from `createTextInput`,
// which the text area shares.

import { textFieldAnatomy } from "@pureform/anatomy";
import {
    TEXT_FIELD_INPUT_PROPS,
    TEXT_FIELD_ROOT_PROPS,
    textFieldSelection,
} from "@pureform/binding-core";
import type {
    TextFieldContentProps,
    TextFieldRootOwnProps,
} from "@pureform/binding-core";
import type { ElementType, InputHTMLAttributes, ReactNode } from "react";

import type { SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { createTextInput } from "../text-input";
import type { TextInputIconProps, TextInputPartProps } from "../text-input";

type Anatomy = typeof textFieldAnatomy;

/** The input attributes the ready-made field passes to its input, in React's spelling. */
const REACT_INPUT_PROPS = [
    "autoComplete",
    "autoCapitalize",
    "autoFocus",
    "enterKeyHint",
    "inputMode",
    "maxLength",
    "minLength",
    "size",
    "spellCheck",
] as const;

type InputAttributes = Pick<
    InputHTMLAttributes<HTMLInputElement>,
    (typeof TEXT_FIELD_INPUT_PROPS)[number] | (typeof REACT_INPUT_PROPS)[number]
>;

/** Root's props: the variants and tokens, the machine's props (`value`, `error`, `name`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface TextFieldRootProps
    extends
        Omit<PartProps, keyof TextFieldRootOwnProps>,
        TextFieldRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export type TextFieldPartProps = TextInputPartProps;

/** An icon part's props: a part's, and `mirror` to flip it under `rtl`. */
export type TextFieldIconProps = TextInputIconProps;

/** The ready-made field's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the label, supporting text, and icons as content, and the input's attributes (`type`,
 *  `autoComplete`, `maxLength`, `aria-label`, …), which go on the input. */
export interface TextFieldProps
    extends
        Omit<
            TextFieldRootProps,
            | keyof SlotKeyedProps<Anatomy>
            | "children"
            | "leadingIcon"
            | "trailingIcon"
            | keyof InputAttributes
        >,
        SlotKeyedProps<Anatomy>,
        TextFieldContentProps<ReactNode>,
        InputAttributes {}

const { ReadyMade, parts } = createTextInput({
    component: "TextField",
    anatomy: textFieldAnatomy,
    element: "input",
    rootProps: TEXT_FIELD_ROOT_PROPS,
    inputProps: [...TEXT_FIELD_INPUT_PROPS, ...REACT_INPUT_PROPS],
    selection: textFieldSelection,
});

/** Material's text field. Use it ready-made, `<TextField label="Email" name="email" />`, or
 *  compose its parts under `TextField.Root`: `Container` holding `LeadingIcon`, `Input`, `Label`,
 *  and `TrailingIcon`, then `SupportingText`. */
export const TextField = Object.assign(
    ReadyMade as (props: TextFieldProps) => ReactNode,
    parts as Omit<typeof parts, "Root"> & {
        Root: (props: TextFieldRootProps) => ReactNode;
    },
);

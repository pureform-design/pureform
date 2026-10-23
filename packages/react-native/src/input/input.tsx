// The plain Input: a `TextInput` in the theme's box. React Native has no date or time input: use
// Material's `DatePicker` and `TimePicker`.

import { inputAnatomy } from "@pureform/anatomy";
import { inputSelection } from "@pureform/binding-core";
import type { InputPart, InputRootOwnProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useTextControl } from "../field/text-control";
import type { TextControlProps } from "../field/text-control";
import { testIdOf, withEngine } from "../parts";

export type InputProps = TextControlProps<InputPart> &
    Omit<InputRootOwnProps, "unstyled" | "testId">;

function InputImpl(props: InputProps): ReactNode {
    return useTextControl(
        "input",
        "Input",
        props,
        inputSelection(props),
        testIdOf(inputAnatomy, "root", props.testId),
    );
}

/** A plain input in the theme's box. */
export const Input = withEngine(InputImpl, "Input");

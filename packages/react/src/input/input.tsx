// The plain Input: the native element in the theme's plain box, its text pureform's
// controllable `value`, and the Field's id, states and descriptions when it's in one.

import { inputAnatomy } from "@pureform/anatomy";
import {
    fieldControlProps,
    INPUT_ROOT_PROPS,
    inputSelection,
} from "@pureform/binding-core";
import type { InputRootOwnProps } from "@pureform/binding-core";
import type { ElementType, InputHTMLAttributes, ReactNode, Ref } from "react";

import { useField } from "../field/context";
import { usePlainText } from "../field/plain-text";
import { useComponent } from "../parts";
import { omitProps } from "../props";

/** The input's props: the field's states over its own, its text (`value`, `defaultValue`,
 *  `onValueChange`), its tokens, `testId` and `unstyled`, `as`, and the input's own props
 *  (`type`, `onChange`). */
export interface InputProps
    extends
        Omit<InputHTMLAttributes<HTMLInputElement>, keyof InputRootOwnProps>,
        InputRootOwnProps {
    readonly ref?: Ref<HTMLInputElement> | undefined;
    /** Another element or component to render instead of `<input>`. */
    readonly as?: ElementType | undefined;
}

/** A plain input in the theme's box. `type="date"`, `"time"` and `"datetime-local"` open the
 *  browser's own pickers; for Material's, use `DatePicker` and `TimePicker`. */
export function Input(props: InputProps): ReactNode {
    const field = useField();
    const text = usePlainText("Input", props);
    const scope = useComponent(inputAnatomy, {
        selection: inputSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, INPUT_ROOT_PROPS);
    return scope.render("root", {
        element: "input",
        as,
        ref: text.ref,
        machine: text.machine,
        props: { ...rest, ...fieldControlProps(field?.state, props) },
    });
}

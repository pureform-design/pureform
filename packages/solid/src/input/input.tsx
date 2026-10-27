// The plain Input: a native input in the theme's box, inside a Field or alone.

import { inputAnatomy } from "@pureform/anatomy";
import { INPUT_ROOT_PROPS, inputSelection } from "@pureform/binding-core";
import type { InputRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { merge, omit } from "solid-js";

import { usePlainText } from "../field/plain-text";
import { useComponent } from "../parts";

/** The input's props: the field's states over its own, its text (`value`, `defaultValue`,
 *  `onValueChange`), its tokens, `testId` and `unstyled`, `as`, and the input's own props
 *  (`type`, `onInput`). */
export interface InputProps
    extends
        Omit<
            JSX.InputHTMLAttributes<HTMLInputElement>,
            keyof InputRootOwnProps
        >,
        InputRootOwnProps {
    /** Another element or component to render instead of `<input>`. */
    readonly as?: ValidComponent | undefined;
}

/** A plain input in the theme's box. `type="date"`, `"time"` and `"datetime-local"` open the
 *  browser's own pickers; for Material's, use `DatePicker` and `TimePicker`. */
export function Input(props: InputProps): JSX.Element {
    const text = usePlainText("Input", props);
    const scope = useComponent(inputAnatomy, {
        selection: () => inputSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const merged = merge(omit(props, "as", ...INPUT_ROOT_PROPS), text.control);
    return scope.render("root", {
        element: "input",
        as: () => props.as,
        machine: text.machine,
        ref: text.ref,
        props: merged,
    });
}

// The plain ErrorText: the error under the field's control, which describes it. Mounted inside a
// Field, it marks the field invalid unless the field's `invalid` says otherwise.

import { errorTextAnatomy } from "@pureform/anatomy";
import {
    ERROR_TEXT_ROOT_PROPS,
    errorTextSelection,
} from "@pureform/binding-core";
import type { ErrorTextRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

import { useDescribes, useField } from "../field/context";
import { useComponent } from "../parts";
import type { PartProps } from "../props";

/** The error's props: its tokens, `testId` and `unstyled`, `as`, and the element's own props. */
export interface ErrorTextProps
    extends
        Omit<PartProps, keyof ErrorTextRootOwnProps>,
        ErrorTextRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ValidComponent | undefined;
}

/** The error under the field's control, which describes it. Render it while the field is
 *  invalid. */
export function ErrorText(props: ErrorTextProps): JSX.Element {
    const field = useField();
    useDescribes(field, "error");
    const scope = useComponent(errorTextAnatomy, {
        selection: () => errorTextSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return scope.render("root", {
        element: "span",
        as: () => props.as,
        machine: () => ({ id: field?.state().ids.error }),
        props: omit(props, "as", ...ERROR_TEXT_ROOT_PROPS),
    });
}

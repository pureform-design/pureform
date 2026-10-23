// The plain ErrorText: the error under the field's control, which describes it and marks the field invalid.

import { errorTextAnatomy } from "@pureform/anatomy";
import {
    ERROR_TEXT_ROOT_PROPS,
    errorTextSelection,
} from "@pureform/binding-core";
import type { ErrorTextRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import { useDescribes, useField } from "../field/context";
import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

/** The error text's props: its tokens, `testId` and `unstyled`, `as`, and the element's own props. */
export interface ErrorTextProps
    extends
        Omit<PartProps, keyof ErrorTextRootOwnProps>,
        ErrorTextRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
}

/** The error under the field's control, which describes it. While it's rendered, the field is
 *  invalid (unless Field's `invalid` says otherwise). */
export function ErrorText(props: ErrorTextProps): ReactNode {
    const field = useField();
    useDescribes(field, "error");
    const scope = useComponent(errorTextAnatomy, {
        selection: errorTextSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, ERROR_TEXT_ROOT_PROPS);
    return scope.render("root", {
        element: "span",
        as,
        machine: { id: field?.state.ids.error },
        props: rest,
    });
}

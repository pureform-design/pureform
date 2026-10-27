// The plain Textarea: the native element in the theme's plain box, its text pureform's
// controllable `value`, and the Field's id, states and descriptions when it's in one.

import { plainTextareaAnatomy } from "@pureform/anatomy";
import {
    TEXTAREA_ROOT_PROPS,
    plainTextareaSelection,
} from "@pureform/binding-core";
import type { TextareaRootOwnProps } from "@pureform/binding-core";
import { fieldControlProps } from "@pureform/binding-web";
import type {
    ElementType,
    TextareaHTMLAttributes,
    ReactNode,
    Ref,
} from "react";

import { useField } from "../field/context";
import { usePlainText } from "../field/plain-text";
import { useComponent } from "../parts";
import { omitProps } from "../props";

/** The textarea's props: as the input's, with the textarea's own. */
export interface TextareaProps
    extends
        Omit<
            TextareaHTMLAttributes<HTMLTextAreaElement>,
            keyof TextareaRootOwnProps
        >,
        TextareaRootOwnProps {
    readonly ref?: Ref<HTMLTextAreaElement> | undefined;
    /** Another element or component to render instead of `<textarea>`. */
    readonly as?: ElementType | undefined;
}

/** A plain textarea in Input's box, resizing vertically. */
export function Textarea(props: TextareaProps): ReactNode {
    const field = useField();
    const text = usePlainText("Textarea", props);
    const scope = useComponent(plainTextareaAnatomy, {
        selection: plainTextareaSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, TEXTAREA_ROOT_PROPS);
    return scope.render("root", {
        element: "textarea",
        as,
        ref: text.ref,
        machine: text.machine,
        props: { ...rest, ...fieldControlProps(field?.state, props) },
    });
}

// The plain Textarea: a native textarea in Input's box, inside a Field or alone.

import { plainTextareaAnatomy } from "@pureform/anatomy";
import {
    plainTextareaSelection,
    TEXTAREA_ROOT_PROPS,
} from "@pureform/binding-core";
import type { TextareaRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { merge, omit } from "solid-js";

import { usePlainText } from "../field/plain-text";
import { useComponent } from "../parts";
import { textareaServerProps } from "../textarea-props";

/** The textarea's props: as the input's, with the textarea's own. */
export interface TextareaProps
    extends
        Omit<
            JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
            keyof TextareaRootOwnProps
        >,
        TextareaRootOwnProps {
    /** Another element or component to render instead of `<textarea>`. */
    readonly as?: ValidComponent | undefined;
}

/** A plain textarea in Input's box, resizing vertically. */
export function Textarea(props: TextareaProps): JSX.Element {
    const text = usePlainText("Textarea", props);
    const scope = useComponent(plainTextareaAnatomy, {
        selection: () => plainTextareaSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const merged = merge(
        omit(props, "as", ...TEXTAREA_ROOT_PROPS),
        text.control,
    );
    return scope.render("root", {
        element: "textarea",
        as: () => props.as,
        machine: () => textareaServerProps(text.machine()),
        ref: text.ref,
        props: merged,
    });
}

// The plain Textarea: Input's box, for several lines.

import { plainTextareaAnatomy } from "@pureform/anatomy";
import { plainTextareaSelection } from "@pureform/binding-core";
import type {
    TextareaPart,
    TextareaRootOwnProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useTextControl } from "../field/text-control";
import type { TextControlProps } from "../field/text-control";
import { testIdOf, withEngine } from "../parts";

export type TextareaProps = TextControlProps<TextareaPart> &
    Omit<TextareaRootOwnProps, "unstyled" | "testId">;

function TextareaImpl(props: TextareaProps): ReactNode {
    return useTextControl(
        "plainTextarea",
        "Textarea",
        {
            multiline: true,
            numberOfLines: 3,
            textAlignVertical: "top",
            ...props,
        },
        plainTextareaSelection(props),
        testIdOf(plainTextareaAnatomy, "root", props.testId),
    );
}

/** A plain textarea in Input's box, for several lines. */
export const Textarea = withEngine(TextareaImpl, "Textarea");

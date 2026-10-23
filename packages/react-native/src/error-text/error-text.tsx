// The plain ErrorText: the error under a Field's control. While it's mounted, the field is invalid
// unless the Field's `invalid` says otherwise.

import { errorTextAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { errorTextSelection } from "@pureform/binding-core";
import type { ErrorTextPart } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useField, useFieldPiece } from "../field/context";
import { testIdOf, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

export interface ErrorTextProps {
    readonly children?: ReactNode;
    readonly tokens?: Parameters<typeof errorTextSelection>[0]["tokens"];
    readonly testId?: TestIdOverride<ErrorTextPart> | undefined;
}

function ErrorTextImpl(props: ErrorTextProps): ReactNode {
    const field = useField();
    useFieldPiece(field, "error");
    const { styles: s, views: v } = useComponentSlots<"root">(
        "errorText",
        errorTextSelection(props),
    );
    return (
        <v.root.Text
            nativeID={field?.state.ids.error}
            style={s.root}
            testID={testIdOf(errorTextAnatomy, "root", props.testId)}
        >
            {props.children}
        </v.root.Text>
    );
}

/** The error under the field's control; mounted, it marks the field invalid. */
export const ErrorText = withEngine(ErrorTextImpl, "ErrorText");

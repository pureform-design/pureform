// The plain Label: names the field's control, dims while it's disabled, and marks it required.

import { labelAnatomy } from "@pureform/anatomy";
import {
    fieldLabelState,
    LABEL_ROOT_PROPS,
    labelSelection,
    REQUIRED_MARK,
} from "@pureform/binding-core";
import type { LabelRootOwnProps } from "@pureform/binding-core";
import { fieldLabelProps } from "@pureform/binding-web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { merge, omit, Show } from "solid-js";

import { useField } from "../field/context";
import { useComponent } from "../parts";
import type { PartProps } from "../props";

/** The label's props: its required mark and dimming over the field's, its tokens, `testId` and
 *  `unstyled`, `as`, and the element's own props. */
export interface LabelProps
    extends
        Omit<
            JSX.LabelHTMLAttributes<HTMLLabelElement>,
            keyof LabelRootOwnProps
        >,
        LabelRootOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ValidComponent | undefined;
    /** The required mark's props (`class`, `style`, attributes). */
    readonly slotProps?:
        | { readonly requiredIndicator?: PartProps | undefined }
        | undefined;
}

/** The label: names the field's control, dims while it's disabled, and marks it required. */
export function Label(props: LabelProps): JSX.Element {
    const field = useField();
    const state = () => fieldLabelState(field?.state(), props);
    const scope = useComponent(labelAnatomy, {
        selection: () => labelSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return scope.render("root", {
        element: "label",
        as: () => props.as,
        machine: () => fieldLabelProps(field?.state(), state()),
        props: merge(omit(props, "as", "slotProps", ...LABEL_ROOT_PROPS), {
            get children() {
                return (
                    <>
                        {props.children}
                        <Show when={state().required}>
                            {scope.render("requiredIndicator", {
                                element: "span",
                                machine: () => ({ "aria-hidden": "true" }),
                                props: merge(
                                    () => props.slotProps?.requiredIndicator,
                                    { children: REQUIRED_MARK },
                                ),
                            })}
                        </Show>
                    </>
                );
            },
        }),
    });
}

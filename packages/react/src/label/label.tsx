// The plain Label: names the field's control, dims while it's disabled, and marks it required.

import { labelAnatomy } from "@pureform/anatomy";
import {
    fieldLabelProps,
    fieldLabelState,
    LABEL_ROOT_PROPS,
    labelSelection,
    REQUIRED_MARK,
} from "@pureform/binding-core";
import type { LabelRootOwnProps } from "@pureform/binding-core";
import type { ElementType, LabelHTMLAttributes, ReactNode, Ref } from "react";

import { useField } from "../field/context";
import { useComponent } from "../parts";
import { omitProps } from "../props";

/** The label's props: its required mark and dimming over the field's, its tokens, `testId` and
 *  `unstyled`, `as`, and the element's own props. */
export interface LabelProps
    extends
        Omit<LabelHTMLAttributes<HTMLLabelElement>, keyof LabelRootOwnProps>,
        LabelRootOwnProps {
    readonly ref?: Ref<HTMLLabelElement> | undefined;
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ElementType | undefined;
}

/** The label: names the field's control, dims while it's disabled, and marks it required. */
export function Label(props: LabelProps): ReactNode {
    const field = useField();
    const state = fieldLabelState(field?.state, props);
    const scope = useComponent(labelAnatomy, {
        selection: labelSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, children, ...rest } = omitProps(props, LABEL_ROOT_PROPS);
    const { for: htmlFor, ...own } = fieldLabelProps(field?.state, state);
    return scope.render("root", {
        element: "label",
        as,
        machine: { ...own, htmlFor },
        props: {
            ...rest,
            children: (
                <>
                    {children}
                    {state.required &&
                        scope.render("requiredIndicator", {
                            element: "span",
                            machine: { "aria-hidden": true },
                            props: { children: REQUIRED_MARK },
                        })}
                </>
            ),
        },
    });
}

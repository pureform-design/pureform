// The plain Description: the supporting text under the field's control, which describes it.

import { descriptionAnatomy } from "@pureform/anatomy";
import {
    DESCRIPTION_ROOT_PROPS,
    descriptionSelection,
} from "@pureform/binding-core";
import type { DescriptionRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

import { useDescribes, useField } from "../field/context";
import { useComponent } from "../parts";
import type { PartProps } from "../props";

/** The supporting pieces' props: their tokens, `testId` and `unstyled`, `as`, and the element's
 *  own props. */
export interface DescriptionProps
    extends
        Omit<PartProps, keyof DescriptionRootOwnProps>,
        DescriptionRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ValidComponent | undefined;
}

/** The supporting text under the field's control, which describes it. */
export function Description(props: DescriptionProps): JSX.Element {
    const field = useField();
    useDescribes(field, "description");
    const scope = useComponent(descriptionAnatomy, {
        selection: () => descriptionSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const rest = omit(props, "as", ...DESCRIPTION_ROOT_PROPS);
    return scope.render("root", {
        element: "span",
        as: () => props.as,
        machine: () => ({ id: field?.state().ids.description }),
        props: rest,
    });
}

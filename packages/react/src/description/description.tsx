// The plain Description: the supporting text under the field's control, which describes it.

import { descriptionAnatomy } from "@pureform/anatomy";
import {
    DESCRIPTION_ROOT_PROPS,
    descriptionSelection,
} from "@pureform/binding-core";
import type { DescriptionRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import { useDescribes, useField } from "../field/context";
import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

/** The description's props: its tokens, `testId` and `unstyled`, `as`, and the element's own props. */
export interface DescriptionProps
    extends
        Omit<PartProps, keyof DescriptionRootOwnProps>,
        DescriptionRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
}

/** The supporting text under the field's control, which describes it. */
export function Description(props: DescriptionProps): ReactNode {
    const field = useField();
    useDescribes(field, "description");
    const scope = useComponent(descriptionAnatomy, {
        selection: descriptionSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, DESCRIPTION_ROOT_PROPS);
    return scope.render("root", {
        element: "span",
        as,
        machine: { id: field?.state.ids.description },
        props: rest,
    });
}

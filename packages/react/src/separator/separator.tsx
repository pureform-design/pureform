// The separator: Material's divider, an `<hr>` (or any element, which then gets `role="separator"`)
// between groups of content.

import { separatorAnatomy } from "@pureform/anatomy";
import {
    SEPARATOR_ROOT_PROPS,
    separatorRootProps,
    separatorSelection,
} from "@pureform/binding-core";
import type { SeparatorRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import type { PartProps } from "../props";
import { createSinglePart } from "../single-part";

/** The separator's props: its own (variants, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface SeparatorProps
    extends
        Omit<PartProps, keyof SeparatorRootOwnProps>,
        SeparatorRootOwnProps {
    /** Another element or component to render instead of `<hr>`. */
    readonly as?: ElementType | undefined;
}

const Root = createSinglePart({
    anatomy: separatorAnatomy,
    element: (_props: SeparatorProps) => "hr",
    ownProps: SEPARATOR_ROOT_PROPS,
    selection: separatorSelection,
    machine: (_props, element) => separatorRootProps(element),
});

/** Material's divider: `<Separator />`, or `<Separator inset="start" />` past a list item's
 *  leading icon. */
export const Separator: ((props: SeparatorProps) => ReactNode) & {
    readonly Root: (props: SeparatorProps) => ReactNode;
} = Object.assign(Root, { Root });

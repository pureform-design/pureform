// The supporting text: the helper or error line under a control, colored by its `tone`. Point the
// control's `aria-describedby` at it.

import { supportingTextAnatomy } from "@pureform/anatomy";
import {
    SUPPORTING_TEXT_ROOT_PROPS,
    supportingTextSelection,
} from "@pureform/binding-core";
import type { SupportingTextRootOwnProps } from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import type { PartProps } from "../props";
import { createSinglePart } from "../single-part";

/** The supporting text's props: its own (variants, tokens, `testId`, `unstyled`), `as`, and the
 *  element's own props. */
export interface SupportingTextProps
    extends
        Omit<PartProps, keyof SupportingTextRootOwnProps>,
        SupportingTextRootOwnProps {
    /** Another element or component to render instead of `<span>`. */
    readonly as?: ElementType | undefined;
}

const Root = createSinglePart({
    anatomy: supportingTextAnatomy,
    element: (_props: SupportingTextProps) => "span",
    ownProps: SUPPORTING_TEXT_ROOT_PROPS,
    selection: supportingTextSelection,
});

/** Helper or error text under a control: `<SupportingText id="hint"
 *  tone="error">Required</SupportingText>`. */
export const SupportingText: ((props: SupportingTextProps) => ReactNode) & {
    readonly Root: (props: SupportingTextProps) => ReactNode;
} = Object.assign(Root, { Root });

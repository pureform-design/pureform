// The supporting text of a field built on a Zag machine (number field, code field, tags input,
// file upload): a `<span>` under the field that shows Root's `error` in place of its own text
// while there is one.

import type { ReactElement, ReactNode } from "react";

import type { RenderOptions } from "./parts";
import type { PartProps } from "./props";

/** Renders the `supportingText` part with `error`, when given, as its content. */
export const renderErrorSupportingText = (
    scope: {
        render(part: "supportingText", options: RenderOptions): ReactElement;
    },
    error: ReactNode | undefined,
    {
        unstyled,
        ...props
    }: PartProps & { readonly unstyled?: boolean | undefined },
): ReactElement =>
    scope.render("supportingText", {
        element: "span",
        unstyled,
        props: { ...props, children: error ?? props.children },
    });

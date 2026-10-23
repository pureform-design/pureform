// The supporting text of a field built on a Zag machine (number field, code field, tags input,
// file upload): a `<span>` under the field that shows Root's `error` in place of its own text
// while there is one.

import type { JSX } from "@solidjs/web";
import { merge, omit } from "solid-js";

import type { RenderOptions } from "./parts";
import type { PartProps } from "./props";

/** Renders the `supportingText` part with `error()`, when there is one, as its content. */
export const renderErrorSupportingText = (
    scope: {
        render(part: "supportingText", options: RenderOptions): JSX.Element;
    },
    error: () => JSX.Element | undefined,
    props: PartProps & { readonly unstyled?: boolean | undefined },
): JSX.Element =>
    scope.render("supportingText", {
        element: "span",
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return error() ?? props.children;
            },
        }),
    });

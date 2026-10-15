// The pureform text: applies one of the theme's text styles.
//
// Its `style` variant has an entry per text style the typography provider declares, so a style
// a theme adds (such as `code`) becomes a variant alongside Material's fifteen, and Panda's
// codegen types it: `text({ style: "code" })`.

import { typed } from "@pureform/core";
import type { ComponentSpec } from "@pureform/core/types";
import { BASE_TEXT_STYLES, textStyle } from "@pureform/theme";

const pf = typed();

/** Build the text component with a `style` variant per name in `styles`. */
export const createText = (
    styles: readonly string[] = BASE_TEXT_STYLES,
): ComponentSpec =>
    pf.component({
        name: "text",
        $meta: {
            description:
                "Sets text in one of the theme's text styles through its style variant.",
        },
        variants: { style: styles },
        recipe: () => ({
            base: {},
            variants: {
                style: Object.fromEntries(
                    styles.map((name) => [
                        name,
                        { textStyle: textStyle(name) },
                    ]),
                ),
            },
            defaultVariants: { style: "bodyMedium" },
        }),
    });

export const text = createText();

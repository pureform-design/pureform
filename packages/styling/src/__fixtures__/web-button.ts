// What a generated web factory module looks like (`.pureform/web/button.ts`): class tables, a
// per-selection cache, and the instance tokens' vars. Generated code names the component
// (`ClassFactory<"button">`); this fixture passes its shape so it doesn't need the registry.

import { joinClasses, selectionCache, withTokenStyle } from "../index";
import type { ClassFactory, ClassSlots, Selection } from "../index";

export type ButtonShape = {
    variants: {
        variant: "filled" | "text";
        size: "small" | "medium";
        toggle: "true" | "false";
    };
    slots: "root" | "label";
    states: "pressed" | "disabled";
    tokens: "accent";
};

const base = { root: "pf-button__root", label: "pf-button__label" };
const variant = {
    filled: { root: "pf-button__root--variant_filled" },
    text: { root: "pf-button__root--variant_text" },
};
const size = {
    small: { root: "pf-button__root--size_small" },
    medium: { root: "pf-button__root--size_medium" },
};
const toggle = {
    true: { root: "pf-button__root--toggle_true" },
    false: { root: "pf-button__root--toggle_false" },
};
const vars = { accent: "--pf-components-button-accent" } as const;

const classes = selectionCache<Selection<ButtonShape>, ClassSlots<ButtonShape>>(
    {
        variants: ["variant", "size", "toggle"],
        defaults: { variant: "filled", size: "medium", toggle: "false" },
    },
    // The cache passes every group as its string, defaults filled in.
    (s) => ({
        root: {
            class: joinClasses(
                base.root,
                variant[s.variant as "filled"].root,
                size[s.size as "medium"].root,
                toggle[s.toggle as "false"].root,
            ),
        },
        label: { class: base.label },
    }),
);

export const button: ClassFactory<ButtonShape> = (s) =>
    withTokenStyle(classes(s), s.tokens, vars);

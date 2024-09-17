import { defineSlotRecipe } from "@pandacss/dev";

export function defineButton() {
    return defineSlotRecipe({
        className: "button",
        slots: ["root", "content", "label", "icon"],
        base: {
            root: {
                position: "relative",
            },
            content: {},
        },

        variants: {
            variant: {
                text: {},
                outlined: {},
                filled: {},
            },
            color: {},
            size: {
                xs: {
                    root: {},
                },
                sm: {
                    root: {},
                },
                md: {
                    root: {},
                },
                lg: {
                    root: {},
                },
            },
        },

        defaultVariants: {
            size: "md",
            variant: "filled",
        },
    });
}

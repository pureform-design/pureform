// Hand-written in the shape `pureform generate` will write (p4b-panda replaces it): the
// registered components' variants, slots, and instance tokens, from the demo's config.

declare module "@pureform/styling" {
    interface ComponentRegistry {
        button: {
            variants: {
                color:
                    | "primary"
                    | "secondary"
                    | "tertiary"
                    | "success"
                    | "warning"
                    | "error"
                    | "info";
                variant: "filled" | "tonal" | "outlined" | "text" | "elevated";
                size: "small" | "medium" | "large";
                density:
                    | "inherit"
                    | "comfortable"
                    | "default"
                    | "compact"
                    | "dense";
            };
            slots: "root" | "label" | "icon" | "touchTarget";
            tokens:
                | "radius"
                | "gap"
                | "iconSize"
                | "iconFill"
                | "outlineWidth"
                | "outlineColor"
                | "heightSmall"
                | "heightMedium"
                | "heightLarge"
                | "paddingSmall"
                | "paddingMedium"
                | "paddingLarge"
                | "accent"
                | "onAccent"
                | "accentContainer"
                | "onAccentContainer"
                | "densityOffset"
                | "corner";
        };
        checkbox: {
            variants: {
                color:
                    | "primary"
                    | "secondary"
                    | "tertiary"
                    | "success"
                    | "warning"
                    | "error"
                    | "info";
                density:
                    | "inherit"
                    | "comfortable"
                    | "default"
                    | "compact"
                    | "dense";
            };
            slots:
                | "root"
                | "touchTarget"
                | "input"
                | "box"
                | "checkIcon"
                | "indeterminateIcon";
            tokens:
                | "size"
                | "boxSize"
                | "boxRadius"
                | "borderWidth"
                | "checkWidth"
                | "checkHeight"
                | "dashWidth"
                | "markThickness"
                | "borderColor"
                | "checkedColor"
                | "iconColor"
                | "errorColor"
                | "errorIconColor"
                | "disabledIconColor"
                | "corner";
        };
    }
}

export {};

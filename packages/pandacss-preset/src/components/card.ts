import { defineSlotRecipe, type SystemStyleObject } from "@pandacss/dev";
import type { BaseColorGroup, BaseTextStyleName } from "@pureform/ui-utils";
import { getClass, getToken, getUtility, prefix } from "../helpers";
import type { BaseArgs, ColorArgs, TypographyArgs } from "./types";

export type DefineCardArgs<
    TColorGroup extends string = BaseColorGroup,
    TTextStyle extends string = BaseTextStyleName,
> = BaseArgs & ColorArgs<TColorGroup> & TypographyArgs<TTextStyle>;

export function defineCard<TColorGroup extends string = BaseColorGroup>(
    args: DefineCardArgs<TColorGroup>,
) {
    const np = args.prefix;
    const className = getClass(np, "scrim");
    const defaultJsx = "Scrim";
    const jsx = [prefix("pascal", np, defaultJsx, "component"), defaultJsx];

    const shadowElevation = getUtility(np, "shadowElevation");

    return defineSlotRecipe({
        className,
        jsx,
        slots: ["root"],
        base: {
            root: {
                borderRadius: "xl",
                p: "4",
            },
        },
        variants: {
            variant: {
                elevated: {
                    root: {
                        bg: getToken(np, "surfaceContainerLow"),
                        color: getToken(np, "onSurface"),
                        ...{
                            [shadowElevation]: "level1",
                        },
                    },
                },
                filled: {
                    root: {
                        bg: getToken(np, "surfaceContainerHighest"),
                        color: getToken(np, "onSurface"),
                    },
                },
                outlined: {
                    root: {
                        bg: getToken(np, "surface"),
                        color: getToken(np, "onSurface"),
                        outline: "1",
                        outlineColor: getToken(np, "outlineVariant"),
                        outlineStyle: "solid",
                    },
                },
            },
            disabled: {
                true: {
                    root: {},
                },
                false: {
                    root: {},
                },
            },
            hovered: {
                true: {
                    root: {},
                },
                false: {
                    root: {},
                },
            },
            focused: {
                true: {
                    root: {},
                },
                false: {
                    root: {},
                },
            },
            pressed: {
                true: {
                    root: {},
                },
                false: {
                    root: {},
                },
            },
            dragged: {
                true: {
                    root: {},
                },
                false: {
                    root: {},
                },
            },
        },
        compoundVariants: [
            {
                disabled: true,
                variant: "elevated",
                css: {
                    root: {
                        backgroundColor: `${getToken(np, "surface")}/38`,
                        color: `${getToken(np, "onSurface")}/38`,
                    },
                },
            },
            {
                hovered: true,
                variant: "elevated",
                css: {
                    root: {
                        ...({
                            [shadowElevation]: "level2",
                        } as SystemStyleObject),
                    },
                },
            },
            {
                dragged: true,
                variant: "elevated",
                css: {
                    root: {
                        ...({
                            [shadowElevation]: "level4",
                        } as SystemStyleObject),
                    },
                },
            },
            {
                disabled: true,
                variant: "filled",
                css: {
                    root: {
                        backgroundColor: `${getToken(np, "surfaceVariant")}/38`,
                        color: `${getToken(np, "onSurface")}/38`,
                        ...{
                            [shadowElevation]: "level0",
                        },
                    },
                },
            },
            {
                disabled: true,
                variant: "outlined",
                css: {
                    root: {
                        backgroundColor: `${getToken(np, "surface")}/38`,
                        color: `${getToken(np, "onSurface")}/38`,
                        outlineColor: `${getToken(np, "outline")}/12`,
                        ...{
                            [shadowElevation]: "level0",
                        },
                    },
                },
            },
        ],
    });
}

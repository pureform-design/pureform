import { type SystemStyleObject, defineSlotRecipe } from "@pandacss/dev";
import type { BaseColorGroup, BaseTextStyleName } from "@pureform/ui-utils";
import { capitalize } from "@repo/utils/string";
import { getClass, getCssVar, getToken, getUtility, prefix } from "../helpers";
import { touchTarget } from "./style-snippets";
import type { BaseArgs, ColorArgs, TypographyArgs } from "./types";

export type DefineButtonArgs<
    TColorGroup extends string = BaseColorGroup,
    TCustomTextStyle extends string = BaseTextStyleName,
> = BaseArgs & ColorArgs<TColorGroup> & TypographyArgs<TCustomTextStyle>;

export function defineButton<TColorGroup extends string = BaseColorGroup>(
    args: DefineButtonArgs<TColorGroup>,
) {
    const np = args.prefix;

    const className = getClass(np, "button");
    const defaultJsx = "Button";
    const jsx = [prefix("kebab", np, defaultJsx, "component"), defaultJsx];

    const colors = {} as Record<
        TColorGroup | BaseColorGroup,
        { root: SystemStyleObject }
    >;

    const buttonMainVar = getCssVar(np, "button-color-main");
    const buttonMainContrastVar = getCssVar(np, "button-color-main-contrast");
    const buttonMainContainerVar = getCssVar(np, "button-color-main-container");
    const buttonMainContainerContrastVar = getCssVar(
        np,
        "button-color-main-container-contrast",
    );

    for (const cg of args.colorScheme.getAllColorGroups()) {
        const main = cg;
        const mainContrast = `on${capitalize(main)}`;
        const mainContainer = `${main}Container`;
        const mainContainerContrast = `on${capitalize(mainContainer)}`;

        colors[cg] = {
            root: {
                [buttonMainVar]: `token(colors.${getToken(np, main)})`,
                [buttonMainContrastVar]: `token(colors.${getToken(np, mainContrast)})`,
                [buttonMainContainerVar]: `token(colors.${getToken(np, mainContainer)})`,
                [buttonMainContainerContrastVar]: `token(colors.${getToken(np, mainContainerContrast)})`,
            } as SystemStyleObject,
        };
    }

    const disabledColor = getToken(np, "onSurface");

    const shadowElevation = getUtility(np, "shadowElevation");

    return defineSlotRecipe({
        className,
        jsx,
        slots: ["root", "label", "icon", "touchTarget"],
        base: {
            root: {
                position: "relative",
                borderRadius: "full",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "2",
            },
            touchTarget,
        },
        variants: {
            color: colors,
            variant: {
                filled: {
                    root: {
                        bg: `var(${buttonMainVar})`,
                        color: `var(${buttonMainContrastVar})`,
                    },
                },
                outlined: {
                    root: {
                        bg: "transparent",
                        color: `var(${buttonMainVar})`,
                        outlineColor: `token(colors.${getToken(np, "outline")})`,
                        outlineStyle: "solid",
                        outline: 1,
                    },
                },
                text: {
                    root: {
                        bg: "transparent",
                        color: `var(${buttonMainVar})`,
                    },
                },
                tonal: {
                    root: {
                        bg: `var(${buttonMainContainerVar})`,
                        color: `var(${buttonMainContainerContrastVar})`,
                    },
                },
                elevated: {
                    root: {
                        color: `var(${buttonMainVar})`,
                        bg: `token(colors.${getToken(np, "surfaceContainerLow")})`,
                        [shadowElevation]: "level1",
                    } as unknown as SystemStyleObject,
                },
            },
            size: {
                small: {
                    root: {
                        height: "8",
                        px: "4",
                    },
                    touchTarget: {
                        height: "10",
                        width: "full",
                    },
                    label: {
                        ...args.typography.get("labelLarge"),
                    },
                },
                medium: {
                    root: {
                        height: "10",
                        px: "6",
                    },
                    touchTarget: {
                        height: "12",
                        width: "full",
                    },
                    label: {
                        ...args.typography.get("labelLarge"),
                    },
                },
                large: {
                    root: {
                        height: "12",
                        px: "8",
                    },
                    touchTarget: {
                        height: "12",
                        width: "full",
                    },
                    label: {
                        ...args.typography.get("labelLarge"),
                    },
                },
            },
            leading: {
                true: {},
                false: {},
            },
            trailing: {
                true: {},
                false: {},
            },
            disabled: {
                true: {
                    root: {
                        pointerEvents: "none",
                    },
                },
            },
        },
        compoundVariants: [
            {
                leading: true,
                size: "small",
                css: {
                    root: {
                        pl: "2",
                    },
                },
            },
            {
                trailing: true,
                size: "small",
                css: {
                    root: {
                        pr: "2",
                    },
                },
            },
            {
                leading: true,
                size: "medium",
                css: {
                    root: {
                        pl: "4",
                    },
                },
            },
            {
                trailing: true,
                size: "medium",
                css: {
                    root: {
                        pr: "4",
                    },
                },
            },
            {
                leading: true,
                size: "large",
                css: {
                    root: {
                        pl: "6",
                    },
                },
            },
            {
                trailing: true,
                size: "large",
                css: {
                    root: {
                        pr: "6",
                    },
                },
            },
            {
                disabled: true,
                variant: "text",
                css: {
                    root: {
                        color: `token(colors.${disabledColor})/38`,
                    },
                },
            },
            {
                disabled: true,
                variant: "outlined",
                css: {
                    root: {
                        color: `token(colors.${disabledColor})/38`,
                        outlineColor: `token(colors.${disabledColor})/12`,
                    },
                },
            },
            {
                disabled: true,
                variant: "filled",
                css: {
                    root: {
                        bg: `token(colors.${disabledColor})/12`,
                        color: `token(colors.${disabledColor})/38`,
                    },
                },
            },
            {
                disabled: true,
                variant: "tonal",
                css: {
                    root: {
                        bg: `token(colors.${disabledColor})/12`,
                        color: `token(colors.${disabledColor})/38`,
                    },
                },
            },
            {
                disabled: true,
                variant: "elevated",
                css: {
                    root: {
                        bg: `token(colors.${disabledColor})/12`,
                        color: `token(colors.${disabledColor})/38`,
                        ...{
                            [shadowElevation]: "level0",
                        },
                    },
                },
            },
        ],
        defaultVariants: {
            color: "primary",
            size: "medium",
            variant: "filled",
            leading: false,
            trailing: false,
        },
    });
}

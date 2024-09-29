import { type SystemStyleObject, defineSlotRecipe } from "@pandacss/dev";
import type { BaseColorGroup } from "@pureform/ui-utils";
import { capitalize } from "@repo/utils/string";
import { getCssVar, getToken, getUtility, prefix } from "../helpers";
import { touchTarget } from "./style-snippets";
import type { BaseArgs, ColorArgs } from "./types";

export type DefineIconButtonArgs<TColorGroup extends string = BaseColorGroup> =
    BaseArgs & ColorArgs<TColorGroup>;

export function defineIconButton<TColorGroup extends string = BaseColorGroup>(
    args: DefineIconButtonArgs<TColorGroup>,
) {
    const np = args.prefix;

    const className = "icon-button";
    const defaultJsx = "IconButton";
    const jsx = [prefix("kebab", np, defaultJsx, "component"), defaultJsx];

    const colors = {} as Record<
        TColorGroup | BaseColorGroup,
        { root: SystemStyleObject }
    >;

    const buttonMainVar = getCssVar(np, "icon-button-color-main");
    const buttonMainContrastVar = getCssVar(
        np,
        "icon-button-color-main-contrast",
    );
    const buttonMainContainerVar = getCssVar(
        np,
        "icon-button-color-main-container",
    );
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
        slots: ["root", "icon", "touchTarget"],
        base: {
            root: {
                position: "relative",
                borderRadius: "full",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
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
                standard: {
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
                        width: "8",
                    },
                    touchTarget: {
                        height: "10",
                        width: "10",
                    },
                },
                medium: {
                    root: {
                        height: "10",
                        width: "10",
                    },
                    touchTarget: {
                        height: "12",
                        width: "12",
                    },
                },
                large: {
                    root: {
                        height: "12",
                        width: "12",
                    },
                    touchTarget: {
                        height: "12",
                        width: "12",
                    },
                },
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
                disabled: true,
                variant: "standard",
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
        },
    });
}

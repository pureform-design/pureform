import { type SystemStyleObject, defineSlotRecipe } from "@pandacss/dev";
import type { BaseColorGroup, BaseTextStyleName } from "@pureform/ui-utils";
import { capitalize } from "@repo/utils/string";
import { getClass, getCssVar, getToken, getUtility, prefix } from "../helpers";
import { touchTarget } from "./style-snippets";
import type { BaseArgs, ColorArgs, TypographyArgs } from "./types";
import { opacityMix } from "./utils";

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

    const disabledBg = getCssVar(np, "button-disabled-background-color");
    const disabledOutline = getCssVar(np, "button-disabled-outline-color");
    const leadingPadding = getCssVar(np, "button-leading-padding");
    const trailingPadding = getCssVar(np, "button-trailing-padding");

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
                        ...{
                            [disabledBg]: opacityMix(
                                `token(colors.${disabledColor})`,
                                0.12,
                            ),
                            [disabledOutline]: "transparent",
                        },
                    },
                },
                outlined: {
                    root: {
                        bg: "transparent",
                        color: `var(${buttonMainVar})`,
                        outlineColor: `token(colors.${getToken(np, "outline")})`,
                        outlineStyle: "solid",
                        outline: 1,
                        ...{
                            [disabledBg]: "transparent",
                            [disabledOutline]: opacityMix(
                                `token(colors.${disabledColor})`,
                                0.12,
                            ),
                        },
                    },
                },
                text: {
                    root: {
                        bg: "transparent",
                        color: `var(${buttonMainVar})`,
                        ...{
                            [disabledBg]: "transparent",
                            [disabledOutline]: "transparent",
                        },
                    },
                },
                tonal: {
                    root: {
                        bg: `var(${buttonMainContainerVar})`,
                        color: `var(${buttonMainContainerContrastVar})`,
                        ...{
                            [disabledBg]: opacityMix(
                                `token(colors.${disabledColor})`,
                                0.12,
                            ),
                            [disabledOutline]: "transparent",
                        },
                    },
                },
                elevated: {
                    root: {
                        color: `var(${buttonMainVar})`,
                        bg: `token(colors.${getToken(np, "surfaceContainerLow")})`,
                        ...{
                            [shadowElevation]: "level1",
                            [disabledBg]: opacityMix(
                                `token(colors.${disabledColor})`,
                                0.12,
                            ),
                            [disabledOutline]: "transparent",
                        },
                    },
                },
            },
            size: {
                small: {
                    root: {
                        height: "8",
                        px: "4",
                        ...{
                            [leadingPadding]: "token(spacing.2)",
                            [trailingPadding]: "token(spacing.2)",
                        },
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
                        ...{
                            [leadingPadding]: "token(spacing.4)",
                            [trailingPadding]: "token(spacing.4)",
                        },
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
                        ...{
                            [leadingPadding]: "token(spacing.6)",
                            [trailingPadding]: "token(spacing.6)",
                        },
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
                true: {
                    root: {
                        pl: `var(${leadingPadding})`,
                    },
                },
                false: {
                    root: {},
                },
            },
            trailing: {
                true: {
                    root: {
                        pr: `var(${trailingPadding})`,
                    },
                },
                false: {},
            },
            disabled: {
                true: {
                    root: {
                        pointerEvents: "none",
                        color: opacityMix(
                            `token(colors.${disabledColor})`,
                            0.38,
                        ),
                        bg: `var(${disabledBg})`,
                        outlineColor: `var(${disabledOutline})`,
                        ...{ [shadowElevation]: "level0" },
                    },
                },
            },
        },
        defaultVariants: {
            color: "primary",
            size: "medium",
            variant: "filled",
            leading: false,
            trailing: false,
            disabled: false,
        },
    });
}

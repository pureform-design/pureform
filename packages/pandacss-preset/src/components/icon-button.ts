import { type SystemStyleObject, defineSlotRecipe } from "@pandacss/dev";
import type { BaseColorGroup } from "@pureform/ui-utils";
import { capitalize } from "@pureform/utils/string";
import { getClass, getCssVar, getToken, getUtility, prefix } from "../helpers";
import { touchTarget } from "./style-snippets";
import type { BaseArgs, ColorArgs } from "./types";
import { opacityMix } from "./utils";

export type DefineIconButtonArgs<TColorGroup extends string = BaseColorGroup> =
    BaseArgs & ColorArgs<TColorGroup>;

export function defineIconButton<TColorGroup extends string = BaseColorGroup>(
    args: DefineIconButtonArgs<TColorGroup>,
) {
    const np = args.prefix;

    const className = getClass(np, "icon-button");
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
    const disabledOutline = getCssVar(np, "icon-button-disabled-outline-color");
    const disabledBg = getCssVar(np, "icon-button-disabled-background-color");

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
                        backgroundColor: `var(${buttonMainVar})`,
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
                        backgroundColor: "transparent",
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
                standard: {
                    root: {
                        backgroundColor: "transparent",
                        color: `var(${buttonMainVar})`,
                        ...{
                            [disabledBg]: "transparent",
                            [disabledOutline]: "transparent",
                        },
                    },
                },
                tonal: {
                    root: {
                        backgroundColor: `var(${buttonMainContainerVar})`,
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
                        backgroundColor: `token(colors.${getToken(np, "surfaceContainerLow")})`,
                        color: `var(${buttonMainVar})`,
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
                        color: `token(colors.${disabledColor})/38`,
                        backgroundColor: `var(${disabledBg})`,
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
            disabled: false,
        },
    });
}

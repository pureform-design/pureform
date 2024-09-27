import { defineSlotRecipe, type SystemStyleObject } from "@pandacss/dev";
import type { BaseColorGroup, BaseTextStyleName } from "@repo/ui-utils";
import { normalizePrefix, prefix } from "../helpers";
import type { BaseArgs, ColorArgs, TypographyArgs } from "./types";
import { capitalize } from "@repo/utils/string";

export type DefineButtonArgs<
    TColorGroup extends string = BaseColorGroup,
    TCustomTextStyle extends string = BaseTextStyleName,
> = BaseArgs & ColorArgs<TColorGroup> & TypographyArgs<TCustomTextStyle>;

export function defineButton<TColorGroup extends string = BaseColorGroup>(
    args: DefineButtonArgs<TColorGroup>,
) {
    const np = normalizePrefix(args.prefix);

    const defaultJsx = "Button";

    const jsx = [prefix("kebab", np, defaultJsx, "component"), defaultJsx];

    function getCssVar(name: string) {
        return `--${prefix("kebab", np, name, "cssVar")}`;
    }

    function getToken(name: string) {
        return prefix("dot", np, name, "token");
    }

    function getUtility(name: string) {
        return prefix("camel", np, name, "utility");
    }

    const colors = {} as Record<
        TColorGroup | BaseColorGroup,
        { root: SystemStyleObject }
    >;

    for (const cg of args.colorScheme.getAllColorGroups()) {
        const main = cg;
        const mainContrast = `on${capitalize(main)}`;
        const mainContainer = `${main}Container`;
        const mainContainerContrast = `on${capitalize(mainContainer)}`;

        colors[cg] = {
            root: {
                [getCssVar("button-color-main")]:
                    `token(colors.${getToken(main)})`,
                [getCssVar("button-color-main-contrast")]:
                    `token(colors.${getToken(mainContrast)})`,
                [getCssVar("button-color-main-container")]:
                    `token(colors.${getToken(mainContainer)})`,
                [getCssVar("button-color-main-container-contrast")]:
                    `token(colors.${getToken(mainContainerContrast)})`,
            } as SystemStyleObject,
        };
    }

    return defineSlotRecipe({
        className: "button",
        jsx,
        slots: ["root", "label", "icon"],
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
        },
        variants: {
            color: colors,
            variant: {
                filled: {
                    root: {
                        bg: `var(${getCssVar("button-color-main")})`,
                        color: `var(${getCssVar("button-color-main-contrast")})`,
                    },
                },
                outlined: {
                    root: {
                        bg: "transparent",
                        color: `var(${getCssVar("button-color-main")})`,
                        outlineColor: `token(colors.${getToken("outline")})`,
                        outlineStyle: "solid",
                        outline: 1,
                    },
                },
                text: {
                    root: {
                        bg: "transparent",
                        color: `var(${getCssVar("button-color-main")})`,
                    },
                },
                tonal: {
                    root: {
                        bg: `var(${getCssVar("button-color-main-container")})`,
                        color: `var(${getCssVar("button-color-main-container-contrast")})`,
                    },
                },
                elevated: {
                    root: {
                        color: `var(${getCssVar("button-color-main")})`,
                        bg: `token(colors.${getToken("surfaceContainerLow")})`,
                        [getUtility("shadowElevation")]: "level1",
                    } as unknown as SystemStyleObject,
                },
            },
            size: {
                small: {
                    root: {
                        height: "8",
                        px: "4",
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
                    label: {
                        ...args.typography.get("labelLarge"),
                    },
                },
                large: {
                    root: {
                        height: "12",
                        px: "8",
                    },
                    label: {
                        ...args.typography.get("labelLarge"),
                    },
                },
            },
            hasLeading: {
                true: {},
                false: {},
            },
            hasTrailing: {
                true: {},
                false: {},
            },
        },
        compoundVariants: [
            {
                hasLeading: true,
                size: "small",
                css: {
                    root: {
                        pl: "2",
                    },
                },
            },
            {
                hasTrailing: true,
                size: "small",
                css: {
                    root: {
                        pr: "2",
                    },
                },
            },
            {
                hasLeading: true,
                size: "medium",
                css: {
                    root: {
                        pl: "4",
                    },
                },
            },
            {
                hasTrailing: true,
                size: "medium",
                css: {
                    root: {
                        pr: "4",
                    },
                },
            },
            {
                hasLeading: true,
                size: "large",
                css: {
                    root: {
                        pl: "6",
                    },
                },
            },
            {
                hasTrailing: true,
                size: "large",
                css: {
                    root: {
                        pr: "6",
                    },
                },
            },
        ],
        defaultVariants: {
            color: "primary",
            size: "medium",
            variant: "filled",
            hasLeading: false,
            hasTrailing: false,
        },
    });
}

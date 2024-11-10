import { defineSlotRecipe } from "@pandacss/dev";
import type { BaseColorGroup } from "@pureform/ui-utils";
import { getClass, getCssVar, prefix } from "../helpers";
import type { BaseArgs, ColorArgs } from "./types";
import { mapColors } from "./utils";

export type DefineRippleLayerArgs<TColorGroup extends string = BaseColorGroup> =
    BaseArgs & ColorArgs<TColorGroup>;

export function defineRippleLayer<TColorGroup extends string = BaseColorGroup>(
    args: DefineRippleLayerArgs<TColorGroup>,
) {
    const np = args.prefix;

    const className = getClass(np, "ripple-layer");
    const defaultJsx = "RippleLayer";
    const jsx = [prefix("pascal", np, defaultJsx, "component"), defaultJsx];

    const colors = Object.fromEntries(
        mapColors(np, args.colorScheme, ({ token, name }) => [
            name,
            {
                ripple: {
                    bg: `token(colors.${token})/30`,
                },
            },
        ]),
    );

    const originX = getCssVar(np, "ripple-origin-x");
    const originY = getCssVar(np, "ripple-origin-y");
    const diameter = getCssVar(np, "ripple-diameter");

    return defineSlotRecipe({
        className,
        jsx,
        slots: ["root", "ripple"],
        base: {
            root: {
                top: 0,
                left: 0,
                w: "full",
                h: "full",
                position: "absolute",
                pointerEvents: "none",
            },
            ripple: {
                position: "absolute",
                borderRadius: "full",
                width: `var(${diameter}, 100%)`,
                height: `var(${diameter}, 100%)`,
                top: `calc(var(${originY}, 0px) - var(${diameter}, 100%) / 2)`,
                left: `calc(var(${originX}, 0px) - var(${diameter}, 100%) / 2)`,
                aspectRatio: "1 / 1",
                filter: `blur(calc(var(${diameter}, 10px) / 2))`,
            },
        },
        variants: {
            color: {
                current: {
                    ripple: {
                        backgroundColor: "currentcolor/30",
                    },
                },
                ...colors,
            },
        },
        defaultVariants: {
            color: "current",
        },
    });
}

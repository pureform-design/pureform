import { defineSlotRecipe } from "@pandacss/dev";
import type { BaseColorGroup } from "@pureform/ui-utils";
import { getClass, getToken, prefix } from "../helpers";
import type { BaseArgs, ColorArgs } from "./types";

export type DefineScrimArgs<TColorGroup extends string = BaseColorGroup> =
    BaseArgs & ColorArgs<TColorGroup>;

export function defineScrim<TColorGroup extends string = BaseColorGroup>(
    args: DefineScrimArgs<TColorGroup>,
) {
    const np = args.prefix;
    const className = getClass(np, "scrim");
    const defaultJsx = "Scrim";
    const jsx = [prefix("pascal", np, defaultJsx, "component"), defaultJsx];

    return defineSlotRecipe({
        className,
        slots: ["root"],
        jsx,
        base: {
            root: {
                position: "absolute",
                top: 0,
                left: 0,
                w: "full",
                h: "full",
                bg: `token(colors.${getToken(np, "scrim")})/30`,
            },
        },
    });
}

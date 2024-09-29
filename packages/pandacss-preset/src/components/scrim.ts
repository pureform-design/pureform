import { defineSlotRecipe } from "@pandacss/dev";
import type { BaseColorGroup } from "@pureform/ui-utils";
import { getToken } from "../helpers";
import type { BaseArgs, ColorArgs } from "./types";

export type DefineScrimArgs<TColorGroup extends string = BaseColorGroup> =
    BaseArgs & ColorArgs<TColorGroup>;

export function defineScrim<TColorGroup extends string = BaseColorGroup>(
    args: DefineScrimArgs<TColorGroup>,
) {
    const np = args.prefix;

    return defineSlotRecipe({
        className: "scrim",
        slots: ["root"],
        base: {
            root: {
                position: "absolute",
                top: 0,
                left: 0,
                w: "full",
                h: "full",
                bg: getToken(np, "scrim"),
                opacity: 0.12,
            },
        },
    });
}

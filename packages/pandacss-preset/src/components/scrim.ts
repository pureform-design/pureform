import { defineSlotRecipe } from "@pandacss/dev";
import type { BaseColorGroup } from "@repo/ui-utils";
import type { BaseArgs, ColorArgs } from "./types";

export type DefineScrimArgs<TColorGroup extends string = BaseColorGroup> =
    BaseArgs & ColorArgs<TColorGroup>;

export function defineScrim<TColorGroup extends string = BaseColorGroup>(
    args: DefineScrimArgs<TColorGroup>,
) {
    return defineSlotRecipe({
        className: "scrim",
        slots: ["root"],
    });
}

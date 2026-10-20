// The input chip's contract, shared by every binding: its parts, variants, and selection. An input
// chip isn't used alone: the tags input renders one per value, on its machine (`tags-input.ts`).

import type { inputChipAnatomy, PartName } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { VariantProp } from "./variants";

/** The input chip's parts: `"root" | "avatar" | "icon" | "label" | "remove" | "touchTarget"`. */
export type InputChipPart = PartName<typeof inputChipAnatomy>;

/** The input chip's variant groups and instance tokens. */
export interface InputChipVariantProps {
    /** Square (the default) or round corners, which tighten while pressed. */
    readonly corner?: VariantProp<"inputChip", "corner">;
    /** Swap the corners while the chip is selected, as Expressive's chips morph. */
    readonly toggle?: boolean | undefined;
    /** The group a selected chip is colored with. */
    readonly color?: VariantProp<"inputChip", "color">;
    readonly density?: VariantProp<"inputChip", "density">;
    readonly tokens?: InstanceTokens<"inputChip"> | undefined;
}

/** The registry selection for the tags input's chips. */
export const inputChipSelection = (
    props: InputChipVariantProps = {},
): Selection<"inputChip"> => ({
    corner: props.corner,
    toggle: props.toggle || undefined,
    color: props.color,
    density: props.density,
    tokens: props.tokens,
});

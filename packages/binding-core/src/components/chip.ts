// The chip's contract, shared by every binding: the props Root takes for itself and how they map
// onto the selection. A chip runs the button machine: an assist or suggestion chip is a plain
// button, and a filter chip a toggle on `selected`, which `aria-pressed` reports.

import type { chipAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { ButtonBehaviorProps } from "./button";
import type { VariantProp } from "./variants";

/** The chip's parts: `"root" | "icon" | "label" | "touchTarget"`. */
export type ChipPart = PartName<typeof chipAnatomy>;

/** The chip's variant groups and instance tokens. */
export interface ChipVariantProps {
    readonly variant?: VariantProp<"chip", "variant">;
    readonly color?: VariantProp<"chip", "color">;
    readonly density?: VariantProp<"chip", "density">;
    readonly tokens?: InstanceTokens<"chip"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`: the button
 *  machine's props (`selected` makes it a filter chip), the variants, `testId`, and `unstyled`. */
export interface ChipRootOwnProps
    extends ChipVariantProps, ButtonBehaviorProps {
    /** A prefix for every part's test id (`wifi` → `wifi-label`), or ids by part. */
    readonly testId?: TestIdOverride<ChipPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ChipPart> | undefined;
}

/** The keys of `ChipRootOwnProps`, which Root keeps off its element. */
export const CHIP_ROOT_PROPS = [
    "variant",
    "color",
    "density",
    "tokens",
    "disabled",
    "type",
    "name",
    "value",
    "form",
    "toggle",
    "id",
    "ids",
    "selected",
    "defaultSelected",
    "onSelectedChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof ChipRootOwnProps)[];

/** The registry selection from Root's props. */
export const chipSelection = (props: ChipVariantProps): Selection<"chip"> => ({
    variant: props.variant,
    color: props.color,
    density: props.density,
    tokens: props.tokens,
});

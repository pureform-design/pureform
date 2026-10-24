// The chip set's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's toggle group (the button group's machine), and the chips the
// ready-made set takes as data. A set is a row of chips (`chipSetAnatomy`) that wraps, or scrolls
// on one line; a selectable set is a filter set whose chips are toggles (`aria-pressed`), one at
// most (`single`) or any number (`multiple`).

import type {
    chipSetAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import { buttonGroupMachineProps } from "./button-group";
import type { ChipVariantProps } from "./chip";
import type { InteractionSourceProps } from "./indication";

/** The set's own parts: `"root"`. */
export type ChipSetPart = PartName<typeof chipSetAnatomy>;

/** The set's own variant and tokens (the chip set recipe's). */
export interface ChipSetVariantProps {
    /** Keeps the chips on one line, scrolling sideways, rather than wrapping them. */
    readonly singleLine?: boolean | undefined;
    readonly tokens?: InstanceTokens<"chipSet"> | undefined;
}

/** The chips' variants, which the set gives every chip under the chip's own. A chip's tokens
 *  aren't among them: the ready-made set gives them in `chipProps`. */
export type ChipSetChipVariantProps = Pick<
    ChipVariantProps,
    "variant" | "corner" | "color" | "density"
>;

/** What Zag's toggle group takes from Root's props. Without `selectable`, the set is a plain
 *  row of chips. */
export interface ChipSetBehaviorProps extends Controllable<"value", string[]> {
    /** Makes the chips filter chips: `single` keeps at most one on, `multiple` any number. */
    readonly selectable?: "single" | "multiple" | undefined;
    /** Whether a single-select set lets its one chip go off again. @default true */
    readonly deselectable?: boolean | undefined;
    /** Disables every chip. */
    readonly disabled?: boolean | undefined;
    /** The set element's id; the machine finds the element by it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface ChipSetRootOwnProps
    extends ChipSetVariantProps, ChipSetChipVariantProps, ChipSetBehaviorProps {
    /** The set element's test id: a prefix (`filters` → `filters-root`), or by part. */
    readonly testId?: TestIdOverride<ChipSetPart> | undefined;
    /** The set's parts, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ChipSetPart> | undefined;
}

/** The keys of `ChipSetRootOwnProps`, which Root keeps off its element. */
export const CHIP_SET_ROOT_PROPS = [
    "singleLine",
    "variant",
    "corner",
    "color",
    "density",
    "tokens",
    "selectable",
    "deselectable",
    "disabled",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof ChipSetRootOwnProps)[];

/** One chip of the ready-made set, as data. */
export interface ChipSetItem<Node = unknown> extends InteractionSourceProps {
    /** Its value in a selectable set, and its key. @default its index */
    readonly value?: string | undefined;
    readonly label?: Node;
    readonly icon?: Node;
    /** The trailing icon (a filter chip's dropdown arrow). */
    readonly trailingIcon?: Node;
    readonly disabled?: boolean | undefined;
    /** Called when it's pressed. */
    readonly onClick?: (() => void) | undefined;
    readonly testId?: string | undefined;
}

/** What the ready-made set renders inside Root. */
export interface ChipSetContentProps<Node> {
    /** The chips, in order. */
    readonly items?: readonly ChipSetItem<Node>[] | undefined;
}

/** The keys of `ChipSetContentProps`. */
export const CHIP_SET_CONTENT_PROPS = [
    "items",
] as const satisfies readonly (keyof ChipSetContentProps<unknown>)[];

/** The set's registry selection. `singleLine` only when on, so a wrapping set keeps its
 *  classes. */
export const chipSetSelection = (
    props: ChipSetVariantProps,
): Selection<"chipSet"> => ({
    singleLine: props.singleLine || undefined,
    tokens: props.tokens,
});

/** Zag's toggle group props from Root's, besides `id`, `dir`, and the controllable `value`: the
 *  button group's, as both are selectable rows of toggles. */
export const chipSetMachineProps: (
    props: ChipSetBehaviorProps,
) => ReturnType<typeof buttonGroupMachineProps> = buttonGroupMachineProps;

/** The variants a chip takes from its set, under its own. */
export const chipSetChipVariants = (
    set: ChipSetChipVariantProps,
    chip: ChipSetChipVariantProps,
): ChipSetChipVariantProps => ({
    variant: chip.variant ?? set.variant,
    corner: chip.corner ?? set.corner,
    color: chip.color ?? set.color,
    density: chip.density ?? set.density,
});

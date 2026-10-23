// The rating's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's rating group machine, and what the ready-made component renders.
// Material 3 has no rating, so the design is pureform's own.

import type {
    PartName,
    ratingAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The rating's parts: `"root" | "label" | "control" | "item" | "icon" | "fill" | "halfFill"`. */
export type RatingPart = PartName<typeof ratingAnatomy>;

/** The rating's variant groups and instance tokens. */
export interface RatingVariantProps {
    readonly color?: VariantProp<"rating", "color">;
    readonly size?: VariantProp<"rating", "size">;
    readonly tokens?: InstanceTokens<"rating"> | undefined;
}

/** What the rating machine takes from Root's props. The value runs from 0 (none) to `count`, in
 *  halves with `allowHalf`. */
export interface RatingBehaviorProps extends Controllable<"value", number> {
    /** The number of stars. @default 5 */
    readonly count?: number | undefined;
    /** Whether a star can be half chosen: the pointer's side of the star, or the arrow keys, pick
     *  it. */
    readonly allowHalf?: boolean | undefined;
    /** Shows the value without taking input. */
    readonly readOnly?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    readonly required?: boolean | undefined;
    /** The name the value submits under.
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the value belongs to, for a rating outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** A star's accessible name, from its position. @default `${index} stars` */
    readonly valueText?: ((index: number) => string) | undefined;
    /** The root element's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface RatingRootOwnProps
    extends RatingVariantProps, RatingBehaviorProps {
    /** A prefix for every part's test id (`quality` → `quality-item`), or ids by part. */
    readonly testId?: TestIdOverride<RatingPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<RatingPart> | undefined;
}

/** The keys of `RatingRootOwnProps`, which Root keeps off its element. */
export const RATING_ROOT_PROPS = [
    "color",
    "size",
    "tokens",
    "count",
    "allowHalf",
    "readOnly",
    "disabled",
    "required",
    "name",
    "form",
    "valueText",
    "id",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof RatingRootOwnProps)[];

/** What the ready-made rating renders, in the framework's node type. */
export interface RatingContentProps<Node> {
    /** The label, also the group's accessible name. */
    readonly label?: Node;
    /** The star. @default a filled star */
    readonly icon?: Node;
}

/** The keys of `RatingContentProps`. */
export const RATING_CONTENT_PROPS = [
    "label",
    "icon",
] as const satisfies readonly (keyof RatingContentProps<unknown>)[];

/** The rating's registry selection from Root's props. */
export const ratingSelection = (
    props: RatingVariantProps,
): Selection<"rating"> => ({
    color: props.color,
    size: props.size,
    tokens: props.tokens,
});

/** The rating machine's props from Root's, besides `id`, `dir`, and the controllable `value`. */
export const ratingMachineProps = (props: RatingBehaviorProps) => ({
    count: props.count,
    allowHalf: props.allowHalf,
    readOnly: props.readOnly,
    disabled: props.disabled,
    required: props.required,
    name: props.name,
    form: props.form,
    translations: props.valueText
        ? { ratingValueText: props.valueText }
        : undefined,
});

/** What each item draws for `value` and the item's 1-based `index`: the filled star, the half
 *  one, or only the empty one. Zag's item state decides the highlight (it follows the pointer
 *  too); this reads it. */
export const starFill = (state: {
    readonly highlighted: boolean;
    readonly half: boolean;
}): "full" | "half" | "none" =>
    state.half ? "half" : state.highlighted ? "full" : "none";

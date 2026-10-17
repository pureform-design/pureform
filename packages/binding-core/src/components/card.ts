// The card's contract, shared by every binding: the props Root takes for itself, how they map onto
// the selection, and Root's element props. A card has no machine: it's a surface (`<div>`), or,
// when the whole card acts, a link (`href`) or a button (`as="button"`), which makes it
// interactive: it takes the state layer, lifts on hover, and renders its touch target.

import type { cardAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The card's parts: `"root" | "touchTarget"`. */
export type CardPart = PartName<typeof cardAnatomy>;

/** The card's variant groups and instance tokens. `interactive` follows Root's element unless
 *  given. */
export interface CardVariantProps {
    readonly variant?: VariantProp<"card", "variant">;
    readonly interactive?: boolean | undefined;
    readonly tokens?: InstanceTokens<"card"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface CardRootOwnProps extends CardVariantProps {
    /** Dims an interactive card; a button is disabled, anything else `aria-disabled`. */
    readonly disabled?: boolean | undefined;
    /** A prefix for every part's test id (`plan` → `plan-root`), or ids by part. */
    readonly testId?: TestIdOverride<CardPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<CardPart> | undefined;
}

/** The keys of `CardRootOwnProps`, which Root keeps off its element. */
export const CARD_ROOT_PROPS = [
    "variant",
    "interactive",
    "tokens",
    "disabled",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof CardRootOwnProps)[];

/** The element Root renders: a link with an `href`, else `as`, else a `<div>`. */
export const cardElement = <E>(props: {
    readonly href?: string | undefined;
    readonly as?: E | undefined;
}): E | "a" | "div" => (props.href !== undefined ? "a" : (props.as ?? "div"));

/** Whether a card is interactive: `interactive` when given, else whether Root renders a link or a
 *  button. */
export const isInteractiveCard = (
    props: Pick<CardVariantProps, "interactive">,
    element: unknown,
): boolean => props.interactive ?? (element === "a" || element === "button");

/** The registry selection from Root's props and element. */
export const cardSelection = (
    props: CardVariantProps,
    element: unknown,
): Selection<"card"> => ({
    variant: props.variant,
    interactive: isInteractiveCard(props, element),
    tokens: props.tokens,
});

/** Root's element props from its state: a button gets `type="button"`, and the disabled state is
 *  a button's `disabled` or `aria-disabled`. */
export const cardRootProps = (
    props: Pick<CardRootOwnProps, "disabled">,
    element: unknown,
) => {
    const button = element === "button";
    return {
        type: button ? ("button" as const) : undefined,
        disabled: button && props.disabled ? true : undefined,
        "aria-disabled":
            !button && props.disabled ? ("true" as const) : undefined,
    };
};

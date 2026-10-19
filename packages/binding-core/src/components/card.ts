// The card's contract, shared by every binding: the props Root takes for itself, how they map onto
// the selection, Root's and the action area's element props, and how the ready-made card lays out
// its content. A card has no machine: it's a surface (`<div>`), or, when the whole card acts, a
// link (`href`) or a button (`as="button"`), which makes it interactive: it takes the state layer,
// lifts on hover, and renders its touch target. A card that acts and has other controls (its
// actions, a header action) puts its own action on the action area instead, a link or a button
// around its media, header, and content, so no control sits inside another; the container then
// follows the action area's states.

import type { cardAnatomy, PartName, TestIdOverride } from "@pureform/anatomy";
import type { IndicationAnatomy } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import { isPresent } from "./content";
import type { InteractiveProps } from "./indication";
import type { VariantProp } from "./variants";

/** The card's parts: `"root" | "touchTarget" | "actionArea" | "media" | "header" | "avatar" |
 *  "headerText" | "headline" | "subhead" | "headerAction" | "content" | "supportingText" |
 *  "actions" | "footer"`. */
export type CardPart = PartName<typeof cardAnatomy>;

/** The card's variant groups and instance tokens. `interactive` follows Root's element unless
 *  given. `padded` is whether Root pads its content: turn it off when the sections lay the card
 *  out (they pad themselves, and the media bleeds to the edges). `actionsAlign` places the
 *  actions at the row's end (Material's) or start. */
export interface CardVariantProps {
    readonly variant?: VariantProp<"card", "variant">;
    readonly interactive?: boolean | undefined;
    readonly padded?: boolean | undefined;
    readonly actionsAlign?: VariantProp<"card", "actionsAlign">;
    readonly tokens?: InstanceTokens<"card"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface CardRootOwnProps extends CardVariantProps, InteractiveProps {
    /** Dims an interactive card; a button is disabled, anything else `aria-disabled`. The action
     *  area takes it as its default. */
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
    "padded",
    "actionsAlign",
    "tokens",
    "disabled",
    "testId",
    "unstyled",
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof CardRootOwnProps)[];

/** The ready-made card's content, by part: Material's anatomy. Each section renders only when
 *  given. */
export interface CardContentProps<Node> {
    /** A picture or video at the card's top, full bleed. */
    readonly media?: Node;
    /** An avatar or icon before the headline. */
    readonly avatar?: Node;
    readonly headline?: Node;
    /** A line under the headline. */
    readonly subhead?: Node;
    /** A control at the header's end, such as an overflow menu's icon button. */
    readonly headerAction?: Node;
    readonly supportingText?: Node;
    /** The card's buttons, in a row. */
    readonly actions?: Node;
    readonly footer?: Node;
}

/** The keys of `CardContentProps`. */
export const CARD_CONTENT_PROPS = [
    "media",
    "avatar",
    "headline",
    "subhead",
    "headerAction",
    "supportingText",
    "actions",
    "footer",
] as const satisfies readonly (keyof CardContentProps<unknown>)[];

/** The element Root renders: a link with an `href`, else `as`, else a `<div>`. The action area
 *  picks its element the same way. */
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
    padded: props.padded,
    actionsAlign: props.actionsAlign,
    tokens: props.tokens,
});

/** Root's element props from its state: a button gets `type="button"`, and the disabled state is
 *  a button's `disabled` or `aria-disabled`. The action area's are the same. */
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

/** Whether a card's indication entry shows now: the root's while Root acts, the action area's
 *  otherwise (an action area inside an acting Root would be a control inside a control). */
export const cardEntryActive =
    (rootInteractive: boolean) =>
    (entry: IndicationAnatomy): boolean =>
        entry.trigger === "root" ? rootInteractive : !rootInteractive;

/** How the ready-made card lays out its content. */
export interface CardLayout {
    /** It shows any of the anatomy's sections, which pad themselves: `padded` turns off unless
     *  given. */
    readonly sections: boolean;
    /** It acts and has other controls, so its action goes on the action area, and Root is a
     *  plain `<div>`. */
    readonly actionArea: boolean;
    /** The header holds a control, so it sits outside the action area, before it. */
    readonly headerOutside: boolean;
    /** It shows the header. */
    readonly header: boolean;
    /** It shows the supporting text, in the content. With any sections, the children go in the
     *  content too, after it. */
    readonly supportingText: boolean;
}

/** The ready-made card's layout from its props and Root's element (`cardElement`). In order: the
 *  media, the header, the content, the actions, and the footer. With an action area, it wraps the
 *  media, header, and content, or only the media and content when the header holds a control,
 *  and the header comes first. */
export const cardLayout = (
    props: CardContentProps<unknown> & Pick<CardVariantProps, "interactive">,
    element: unknown,
): CardLayout => {
    const given = (key: keyof CardContentProps<unknown>) =>
        isPresent(props[key]);
    const header =
        given("avatar") ||
        given("headline") ||
        given("subhead") ||
        given("headerAction");
    const sections = CARD_CONTENT_PROPS.some(given);
    const actionArea =
        isInteractiveCard(props, element) &&
        (given("actions") || given("headerAction"));
    return {
        sections,
        actionArea,
        headerOutside: actionArea && given("headerAction"),
        header,
        supportingText: given("supportingText"),
    };
};

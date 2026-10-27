import type { CardRootOwnProps } from "@pureform/binding-core";
import {
    cardLayout as layout,
    cardSelection as selection,
    isInteractiveCard as interactive,
} from "@pureform/binding-core";
import type {
    CardContentProps,
    CardVariantProps,
} from "@pureform/binding-core";

export const isInteractiveCard = (
    props: Pick<CardVariantProps, "interactive">,
    element: unknown,
): boolean => interactive(props, isInteractiveElement(element));
export const cardSelection = (props: CardVariantProps, element: unknown) =>
    selection(props, isInteractiveElement(element));
export const cardLayout = (
    props: CardContentProps<unknown> & Pick<CardVariantProps, "interactive">,
    element: unknown,
) => layout(props, isInteractiveElement(element));

/** The element Root renders: a link with an `href`, else `as`, else a `<div>`. The action area
 *  picks its element the same way. */
export const cardElement = <E>(props: {
    readonly href?: string | undefined;
    readonly as?: E | undefined;
}): E | "a" | "div" => (props.href !== undefined ? "a" : (props.as ?? "div"));

export const isInteractiveElement = (element: unknown): boolean =>
    element === "a" || element === "button";

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

import type { ListItemStateProps } from "@pureform/binding-core";
import type { ListItemExpandProps } from "@pureform/binding-core";
import {
    listItemSelection as selection,
    isInteractiveListItem as interactive,
} from "@pureform/binding-core";
import type { ListItemVariantProps } from "@pureform/binding-core";

import { isInteractiveElement } from "./card";

export const listItemSelection = (
    props: ListItemVariantProps,
    element: unknown,
) => selection(props, isInteractiveElement(element));
export const isInteractiveListItem = (
    props: Pick<ListItemVariantProps, "interactive">,
    element: unknown,
) => interactive(props, isInteractiveElement(element));

/** The value of an expandable item's single accordion item, on the web bindings. */
export const LIST_ITEM_EXPAND_VALUE = "item";
/** Zag's accordion props for an expandable item, one item that opens and closes, from the item's
 *  `expanded`, `defaultExpanded` and `onExpandedChange`. */
export const listItemExpandMachineProps = (props: ListItemExpandProps) => ({
    collapsible: true,
    multiple: false,
    value:
        props.expanded === undefined
            ? undefined
            : props.expanded
              ? [LIST_ITEM_EXPAND_VALUE]
              : [],
    defaultValue: props.defaultExpanded ? [LIST_ITEM_EXPAND_VALUE] : [],
    onValueChange: (details: { value: string[] }) =>
        props.onExpandedChange?.({
            expanded: details.value.includes(LIST_ITEM_EXPAND_VALUE),
        }),
});

/** The element Root renders: a link with an `href`, else `as`, else a `<div>`. */
export const listItemElement = <E>(props: {
    readonly href?: string | undefined;
    readonly as?: E | undefined;
}): E | "a" | "div" => (props.href !== undefined ? "a" : (props.as ?? "div"));

/** Root's element props from its state: `aria-current` while selected, and the disabled state as
 *  a button's `disabled` or `aria-disabled`; a button also gets `type="button"`. */
export const listItemRootProps = (
    props: ListItemStateProps,
    element: unknown,
) => {
    const button = element === "button";
    return {
        type: button ? ("button" as const) : undefined,
        "aria-current": props.selected
            ? element === "a"
                ? ("page" as const)
                : ("true" as const)
            : undefined,
        disabled: button && props.disabled ? true : undefined,
        "aria-disabled":
            !button && props.disabled ? ("true" as const) : undefined,
    };
};

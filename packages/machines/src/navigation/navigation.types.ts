import type { Machine, Service } from "@zag-js/core";
import type {
    CommonProperties,
    DirectionProperty,
    PropTypes,
} from "@zag-js/types";

import type { ItemInteractionProps } from "../interaction";

export interface ValueChangeDetails {
    value: string | null;
}

export interface ElementIds {
    root?: string | undefined;
    item?: ((value: string) => string) | undefined;
}

export interface NavigationProps
    extends DirectionProperty, CommonProperties, ItemInteractionProps {
    /** The ids of the elements in the navigation. Useful for composition. */
    ids?: ElementIds | undefined;
    /** The controlled value: the current destination's. */
    value?: string | null | undefined;
    /** The value it starts with, when `value` isn't controlled. @default null */
    defaultValue?: string | null | undefined;
    /** Called when the user chooses another destination. */
    onValueChange?: ((details: ValueChangeDetails) => void) | undefined;
    /** Disables every destination. */
    disabled?: boolean | undefined;
}

export type NavigationEvent =
    | { type: "ITEM.CLICK"; value: string }
    | { type: "VALUE.SET"; value: string | null };

export interface NavigationSchema {
    state: "idle";
    props: NavigationProps;
    context: {
        value: string | null;
    };
    event: NavigationEvent;
    action: string;
    effect: string;
    guard: string;
}

export type NavigationService = Service<NavigationSchema>;
export type NavigationMachine = Machine<NavigationSchema>;

export interface ItemProps {
    /** The destination's value. */
    value: string;
    /** Disables this destination only. */
    disabled?: boolean | undefined;
    /** What `aria-current` says while it's the current destination: `"page"` for a link to a
     *  page, `"true"` for a destination within the page. @default "page" */
    current?: "page" | "true" | undefined;
}

export interface ItemState {
    /** Whether it's the current destination. */
    current: boolean;
    disabled: boolean;
}

export interface NavigationApi<T extends PropTypes = PropTypes> {
    /** The current destination's value, or `null`. */
    value: string | null;
    /** Make a destination current; `onValueChange` reports it, as Zag's `setValue` does. */
    setValue: (value: string | null) => void;
    getItemState: (props: ItemProps) => ItemState;
    getRootProps: () => T["element"];
    /** The rail's header, above the destinations: its menu button and FAB. */
    getHeaderProps: () => T["element"];
    getItemProps: (props: ItemProps) => T["element"];
    getIconProps: () => T["element"];
    getLabelProps: () => T["element"];
}

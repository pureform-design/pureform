// The menu's contract, shared by every binding: the props Root takes for itself, how they map onto
// the selection and Zag's menu machine, and the items the ready-made menu takes as data. The
// bindings render Root (an unstyled element around the trigger and the menu), the trigger, Zag's
// positioner, and the menu's surface (`Content`) with its items, in place rather than in a
// portal.

import type {
    menuOverlayAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { OverlayPositioning } from "./overlay";
import type { VariantProp } from "./variants";

/** The menu's parts: `"root" | "trigger" | "positioner" | "content"` (the surface) `| "item" |
 *  "itemLeading" | "itemLabel" | "itemTrailing" | "itemTrailingText"`. */
export type MenuPart = PartName<typeof menuOverlayAnatomy>;

/** The menu's variant groups and instance tokens. */
export interface MenuVariantProps {
    readonly color?: VariantProp<"menu", "color">;
    readonly density?: VariantProp<"menu", "density">;
    readonly tokens?: InstanceTokens<"menu"> | undefined;
}

/** The ids of the menu's elements, for composition. Zag builds each item's id from the menu's id
 *  and the item's value. */
export interface MenuElementIds {
    readonly trigger?: string | undefined;
    readonly positioner?: string | undefined;
    readonly content?: string | undefined;
}

/** What the menu reports when the user chooses an item. */
export interface MenuSelectDetails {
    readonly value: string;
}

/** What the menu machine takes from Root's props. `open` is the menu's. */
export interface MenuBehaviorProps extends Controllable<"open", boolean> {
    /** Called when the user chooses an item, with its value. */
    readonly onSelect?: ((details: MenuSelectDetails) => void) | undefined;
    /** Whether choosing an item closes the menu. An item's own `closeOnSelect` wins.
     *  @default true */
    readonly closeOnSelect?: boolean | undefined;
    /** Whether the arrow keys go round from the last item to the first. @default false */
    readonly loopFocus?: boolean | undefined;
    /** Whether typing moves to the item that starts with what's typed. @default true */
    readonly typeahead?: boolean | undefined;
    /** Where the menu opens. @default `{ placement: "bottom-start" }` */
    readonly positioning?: OverlayPositioning | undefined;
    /** The menu's name, when it has no trigger to take it from. */
    readonly "aria-label"?: string | undefined;
    readonly ids?: MenuElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface MenuRootOwnProps
    extends MenuVariantProps, MenuBehaviorProps, IndicationProps {
    /** A prefix for every part's test id (`edit` → `edit-trigger`, `edit-item`), or ids by part. */
    readonly testId?: TestIdOverride<MenuPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<MenuPart> | undefined;
}

/** The keys of `MenuRootOwnProps`, which Root keeps off its element. */
export const MENU_ROOT_PROPS = [
    "color",
    "density",
    "tokens",
    "onSelect",
    "closeOnSelect",
    "loopFocus",
    "typeahead",
    "positioning",
    "aria-label",
    "ids",
    "open",
    "defaultOpen",
    "onOpenChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof MenuRootOwnProps)[];

/** One item of the ready-made menu, as data; its label and icons in the framework's node type. */
export interface MenuItem<Node = unknown> extends InteractionSourceProps {
    readonly value: string;
    readonly label: Node;
    /** The text typeahead matches, when the label isn't plain text. */
    readonly valueText?: string | undefined;
    readonly disabled?: boolean | undefined;
    /** Whether choosing it closes the menu, over the menu's `closeOnSelect`. */
    readonly closeOnSelect?: boolean | undefined;
    /** An icon before the label. */
    readonly leadingIcon?: Node;
    /** An icon after the label. */
    readonly trailingIcon?: Node;
    /** Text after the label, such as a keyboard shortcut. */
    readonly trailingText?: Node;
    /** Flip the icons under `rtl`, for icons that point. */
    readonly mirrorLeadingIcon?: boolean | undefined;
    readonly mirrorTrailingIcon?: boolean | undefined;
}

/** What the ready-made menu renders inside Root, in the framework's node type. */
export interface MenuContentProps<Node> {
    /** The trigger's label: the ready-made menu renders its trigger as a button only when given. */
    readonly trigger?: Node;
    /** The items, in order. */
    readonly items?: readonly MenuItem<Node>[] | undefined;
}

/** The keys of `MenuContentProps`. */
export const MENU_CONTENT_PROPS = [
    "trigger",
    "items",
] as const satisfies readonly (keyof MenuContentProps<unknown>)[];

/** The menu's registry selection from Root's props. */
export const menuSelection = (props: MenuVariantProps): Selection<"menu"> => ({
    color: props.color,
    density: props.density,
    tokens: props.tokens,
});

/** Zag's menu props from Root's, besides `id`, `dir`, and the controllable `open`. */
export const menuMachineProps = (props: MenuBehaviorProps) => ({
    onSelect: props.onSelect,
    closeOnSelect: props.closeOnSelect,
    loopFocus: props.loopFocus,
    typeahead: props.typeahead,
    positioning: { placement: "bottom-start" as const, ...props.positioning },
    "aria-label": props["aria-label"],
    ids: {
        trigger: props.ids?.trigger,
        positioner: props.ids?.positioner,
        content: props.ids?.content,
    },
});

/** Zag's item props for one item from the ready-made menu's data. */
export const menuItemProps = (item: MenuItem) => ({
    value: item.value,
    valueText: item.valueText,
    disabled: item.disabled,
    closeOnSelect: item.closeOnSelect,
    interactionSource: item.interactionSource,
});

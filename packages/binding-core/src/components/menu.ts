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

/** The menu's parts: `"root" | "trigger" | "contextTrigger" | "positioner" | "content"` (the surface) `|
 *  "itemGroup" | "itemGroupLabel" | "item" | "itemLeading" | "itemContent" | "itemLabel" |
 *  "itemSupportingText" | "itemTrailing" | "itemTrailingText"`. */
export type MenuPart = PartName<typeof menuOverlayAnatomy>;

/** The menu's variant groups and instance tokens. */
export interface MenuVariantProps {
    readonly color?: VariantProp<"menu", "color">;
    readonly density?: VariantProp<"menu", "density">;
    /** Material's vibrant colors: the tertiary container's. */
    readonly vibrant?: boolean | undefined;
    /** Each group drawn as its own tile, apart from the next. The ready-made menu sets it when
     *  given `groups`, unless given. */
    readonly grouped?: boolean | undefined;
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
    "vibrant",
    "grouped",
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
    /** A toggleable item: `checkbox` turns on and off, `radio` is one of its group. It fills
     *  while `checked`. */
    readonly type?: "checkbox" | "radio" | undefined;
    readonly checked?: boolean | undefined;
    /** Called when a toggleable item turns on or off. */
    readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
    /** A line under the label. */
    readonly supportingText?: Node;
    /** An icon before the label. */
    readonly leadingIcon?: Node;
    /** An icon after the label. */
    readonly trailingIcon?: Node;
    /** Text after the label, such as a keyboard shortcut. */
    readonly trailingText?: Node;
    /** Flip the icons under `rtl`, for icons that point. */
    readonly mirrorLeadingIcon?: boolean | undefined;
    readonly mirrorTrailingIcon?: boolean | undefined;
    /** A submenu's items: the item opens them in a menu beside it, an arrow in its trailing
     *  place, instead of being chosen. */
    readonly items?: readonly MenuItem<Node>[] | undefined;
}

/** Whether a ready-made item opens a submenu. */
export const hasSubmenu = (item: Pick<MenuItem, "items">): boolean =>
    (item.items?.length ?? 0) > 0;

/** Where a submenu opens: beside its trigger item, toward the end of the line. */
export const submenuPositioning = (
    dir: "ltr" | "rtl",
    positioning?: OverlayPositioning,
): OverlayPositioning => ({
    placement: dir === "rtl" ? "left-start" : "right-start",
    gutter: 0,
    ...positioning,
});

/** How the ready-made menu opens a submenu: `cascade` beside its item, `drill` in the menu's
 *  place (the submenu's items under a row that goes back, headed by the item's label), `auto`
 *  cascading when there's room beside the menu, else drilling. */
export type MenuSubmenu = "cascade" | "drill" | "auto";

/** The room a cascading submenu has: the widest side beside the open menu (px, to the edge of
 *  what bounds it: its container, or the window), and what a submenu needs there (the menu's own
 *  width; Material's submenus are menus alike). */
export interface MenuSubmenuRoom {
    readonly beside: number;
    readonly needed: number;
}

/** The room beside a `menu` box inside a `boundary` box (both along the screen's x axis). */
export const menuSubmenuRoomOf = (
    menu: { readonly left: number; readonly right: number },
    boundary: { readonly left: number; readonly right: number },
): MenuSubmenuRoom => ({
    beside: Math.max(boundary.right - menu.right, menu.left - boundary.left, 0),
    needed: menu.right - menu.left,
});

/** What `submenu` comes to given the `room` the open menu has (`undefined` before it's measured,
 *  as when rendering on a server: cascading). `auto` cascades when a submenu fits beside the
 *  menu, on either side, and drills when it doesn't. */
export const menuSubmenuMode = (
    submenu: MenuSubmenu | undefined,
    room: MenuSubmenuRoom | undefined,
): "cascade" | "drill" =>
    submenu === "cascade" || submenu === "drill"
        ? submenu
        : room !== undefined && room.beside < room.needed
          ? "drill"
          : "cascade";

/** The value of a drilled-in submenu's row that goes back out. */
export const MENU_BACK_VALUE = "pf-menu-back";

/** A drilled menu at `path` (the values of the submenu items drilled into, outermost first):
 *  the innermost submenu's item, if any, and the items it shows (the top level's `items` and
 *  `groups`, or that submenu's items). A value that no longer opens a submenu ends the path. */
export const menuDrillLevel = <Node>(
    items: readonly MenuItem<Node>[],
    groups: readonly MenuGroup<Node>[],
    path: readonly string[],
): {
    readonly submenu: MenuItem<Node> | undefined;
    readonly depth: number;
    readonly items: readonly MenuItem<Node>[];
    readonly groups: readonly MenuGroup<Node>[];
} => {
    let level: readonly MenuItem<Node>[] = [
        ...items,
        ...groups.flatMap((group) => group.items),
    ];
    let submenu: MenuItem<Node> | undefined;
    let depth = 0;
    for (const value of path) {
        const next = level.find((entry) => entry.value === value);
        if (!next || !hasSubmenu(next)) break;
        submenu = next;
        depth++;
        level = next.items!;
    }
    return submenu
        ? { submenu, depth, items: level, groups: [] }
        : { submenu, depth, items, groups };
};

/** A group of the ready-made menu's items, with an optional label. */
export interface MenuGroup<Node = unknown> {
    /** Its id among the groups, which its label's id is built from. */
    readonly id: string;
    readonly label?: Node;
    readonly items: readonly MenuItem<Node>[];
}

/** What the ready-made menu renders inside Root, in the framework's node type. */
export interface MenuContentProps<Node> {
    /** The trigger's label: the ready-made menu renders its trigger as a button only when given. */
    readonly trigger?: Node;
    /** An area that opens the menu at the pointer: a right-click, a touch held down (React Native: a
     *  long press, at the touch point), or the context menu key or Shift+F10 pressed in it. Given,
     *  the ready-made menu renders it (around this content) before the menu; it works with or
     *  without a `trigger`. */
    readonly contextTrigger?: Node;
    /** The items, in order. */
    readonly items?: readonly MenuItem<Node>[] | undefined;
    /** Groups of items, after `items`; the menu is `grouped` unless told otherwise. */
    readonly groups?: readonly MenuGroup<Node>[] | undefined;
    /** How an item with `items` opens its submenu: `cascade` beside it, `drill` in the menu's
     *  place under a row that goes back, `auto` cascading when a submenu fits beside the
     *  open menu (within its container and the window), else drilling. @default "auto" */
    readonly submenu?: MenuSubmenu | undefined;
}

/** The keys of `MenuContentProps`. */
export const MENU_CONTENT_PROPS = [
    "trigger",
    "contextTrigger",
    "items",
    "groups",
    "submenu",
] as const satisfies readonly (keyof MenuContentProps<unknown>)[];

/** The menu's registry selection from Root's props. */
export const menuSelection = (props: MenuVariantProps): Selection<"menu"> => ({
    color: props.color,
    density: props.density,
    vibrant: props.vibrant,
    grouped: props.grouped,
    tokens: props.tokens,
});

/** Whether the ready-made menu draws its groups as tiles: `grouped`, else whether it has
 *  groups. */
export const menuGrouped = (
    props: Pick<MenuVariantProps, "grouped"> &
        Pick<MenuContentProps<unknown>, "groups">,
): boolean => props.grouped ?? (props.groups?.length ?? 0) > 0;

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
    type: item.type,
    checked: item.checked,
    onCheckedChange: item.onCheckedChange,
    interactionSource: item.interactionSource,
});

/** The props an item part takes about what it is: Zag's, and for a toggleable item its type,
 *  whether it's checked, and the callback. */
export interface MenuItemBehaviorProps extends InteractionSourceProps {
    readonly value: string;
    readonly valueText?: string | undefined;
    readonly disabled?: boolean | undefined;
    readonly closeOnSelect?: boolean | undefined;
    readonly type?: "checkbox" | "radio" | undefined;
    readonly checked?: boolean | undefined;
    readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
}

/** The keys of `MenuItemBehaviorProps`, which an item keeps off its element. */
export const MENU_ITEM_PROPS = [
    "value",
    "valueText",
    "disabled",
    "closeOnSelect",
    "type",
    "checked",
    "onCheckedChange",
    "interactionSource",
] as const satisfies readonly (keyof MenuItemBehaviorProps)[];

/** Zag's item props, a toggleable item's (`getOptionItemProps`) when it has a type. */
export const menuItemMachineProps = <P>(
    api: {
        getItemProps(item: {
            value: string;
            valueText?: string | undefined;
            disabled?: boolean | undefined;
            closeOnSelect?: boolean | undefined;
        }): P;
        getOptionItemProps(item: {
            value: string;
            valueText?: string | undefined;
            disabled?: boolean | undefined;
            closeOnSelect?: boolean | undefined;
            type: "checkbox" | "radio";
            checked: boolean;
            onCheckedChange?: ((checked: boolean) => void) | undefined;
        }): P;
    },
    item: MenuItemBehaviorProps,
): P => {
    const base = {
        value: item.value,
        valueText: item.valueText,
        disabled: item.disabled,
        closeOnSelect: item.closeOnSelect,
    };
    return item.type === undefined
        ? api.getItemProps(base)
        : api.getOptionItemProps({
              ...base,
              type: item.type,
              checked: item.checked ?? false,
              onCheckedChange: item.onCheckedChange,
          });
};

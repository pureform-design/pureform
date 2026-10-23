// The FAB menu's contract, shared by every binding: the FAB opens Zag's menu, whose items stack
// above it, and turns into the close button while it's open. Root takes the menu's behaviour
// props.

import type {
    fabMenuAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { MenuBehaviorProps } from "./menu";
import {
    MENU_BUTTON_BEHAVIOR_PROPS,
    menuButtonMachineProps,
} from "./menu-button";
import type { VariantProp } from "./variants";

/** The FAB menu's parts: `"root" | "list" | "item" | "itemIcon" | "itemLabel" | "closeTrigger"`. */
export type FabMenuPart = PartName<typeof fabMenuAnatomy>;

/** The FAB menu's variant groups and instance tokens. */
export interface FabMenuVariantProps {
    readonly color?: VariantProp<"fabMenu", "color">;
    readonly size?: VariantProp<"fabMenu", "size">;
    readonly tokens?: InstanceTokens<"fabMenu"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. Name the FAB with
 *  its own `aria-label`; `aria-label` here names the menu. */
export interface FabMenuRootOwnProps
    extends FabMenuVariantProps, MenuBehaviorProps, IndicationProps {
    /** A prefix for every part's test id (`create` → `create-item`), or ids by part. */
    readonly testId?: TestIdOverride<FabMenuPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<FabMenuPart> | undefined;
}

/** The keys of `FabMenuRootOwnProps`, which Root keeps off its element. */
export const FAB_MENU_ROOT_PROPS = [
    "color",
    "size",
    "tokens",
    ...MENU_BUTTON_BEHAVIOR_PROPS,
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof FabMenuRootOwnProps)[];

/** The FAB menu's registry selection from Root's props, with the number of items its list
 *  holds (the `itemCount` token, which times the list's exit to its last item's), under the
 *  app's own tokens. */
export const fabMenuSelection = (
    props: FabMenuVariantProps,
    itemCount?: number,
): Selection<"fabMenu"> => ({
    color: props.color,
    size: props.size,
    tokens:
        itemCount === undefined ? props.tokens : { itemCount, ...props.tokens },
});

/** The FAB menu's items open above the FAB, at its end. */
export const fabMenuMachineProps = (props: MenuBehaviorProps) =>
    menuButtonMachineProps(props, "top-end");

/** One item of the ready-made FAB menu, as data. */
export interface FabMenuItem<Node = unknown> extends InteractionSourceProps {
    readonly value: string;
    readonly label: Node;
    /** The text typeahead matches, when the label isn't plain text. */
    readonly valueText?: string | undefined;
    readonly icon?: Node;
    readonly disabled?: boolean | undefined;
    /** Flip the icon under `rtl`, for an icon that points. */
    readonly mirrorIcon?: boolean | undefined;
}

/** What the ready-made FAB menu renders inside Root, in the framework's node type. */
export interface FabMenuContentProps<Node> {
    /** The FAB's icon while the menu is closed. */
    readonly icon?: Node;
    /** The FAB's icon while it's open. A cross unless given. */
    readonly closeIcon?: Node;
    /** The FAB's accessible name. */
    readonly fabLabel?: string | undefined;
    /** The items, in order, from the top. */
    readonly items?: readonly FabMenuItem<Node>[] | undefined;
}

/** The keys of `FabMenuContentProps`. */
export const FAB_MENU_CONTENT_PROPS = [
    "icon",
    "closeIcon",
    "fabLabel",
    "items",
] as const satisfies readonly (keyof FabMenuContentProps<unknown>)[];

/** Zag's item props for one item of the ready-made FAB menu. */
export const fabMenuItemProps = (item: FabMenuItem) => ({
    value: item.value,
    valueText: item.valueText,
    disabled: item.disabled,
    interactionSource: item.interactionSource,
});

/** An item's own props (React's names), which make each item a stop of its own for Tab, as
 *  Compose's FAB menu items are: tabbable unless disabled, and highlighted while focused, so
 *  Enter and Space press the item that has focus. */
export const fabMenuItemFocusProps = (
    disabled: boolean | undefined,
    highlight: () => void,
) => ({
    tabIndex: disabled ? -1 : 0,
    onFocus: highlight,
});

/** The keyboard event the list's Tab handling reads, in any binding. */
interface FabMenuTabEvent {
    readonly key: string;
    readonly shiftKey: boolean;
    readonly target: EventTarget | null;
    readonly currentTarget: EventTarget | null;
    readonly defaultPrevented: boolean;
    preventDefault(): void;
}

/** The list's (the menu content's) props, with Tab from its last item going on to the FAB. Zag's
 *  menu keeps Tab inside its content at the last tabbable item; the FAB follows the list. */
export const fabMenuListProps = <
    P extends { readonly onKeyDown?: ((event: any) => void) | undefined },
>(
    content: P,
    getFab: () => HTMLElement | null | undefined,
): P => ({
    ...content,
    onKeyDown(event: FabMenuTabEvent) {
        if (event.key === "Tab" && !event.shiftKey && !event.defaultPrevented) {
            const list = event.currentTarget as HTMLElement | null;
            const items = list?.querySelectorAll<HTMLElement>(
                '[role^="menuitem"]:not([tabindex="-1"])',
            );
            const last = items?.[items.length - 1];
            const fab = getFab();
            if (fab && (last === undefined || event.target === last)) {
                event.preventDefault();
                fab.focus();
                return;
            }
        }
        content.onKeyDown?.(event);
    },
});

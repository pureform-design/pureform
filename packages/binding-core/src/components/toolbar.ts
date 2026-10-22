// The toolbar's contract, shared by every binding: the props Root takes for itself, the elements
// the ready-made toolbar takes as data, and how it moves those that don't fit into the overflow
// menu. The toolbar is the preset's `toolbar` (a docked or floating bar); its elements are the
// preset's icon buttons and buttons, and its overflow menu the menu component.

import type {
    PartName,
    TestIdOverride,
    toolbarAnatomy,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { ProvidedTokens } from "../provided-tokens";
import type { InteractionSourceProps } from "./indication";
import type { MenuItem } from "./menu";
import type { VariantProp } from "./variants";

/** The toolbar's parts: `"root"`. */
export type ToolbarPart = PartName<typeof toolbarAnatomy>;

/** The toolbar's variants and tokens. */
export interface ToolbarVariantProps {
    /** `floating` (a pill hugging its elements, the default) or `docked` (filling its edge). */
    readonly placement?: VariantProp<"toolbar", "placement">;
    /** `vertical` stands a floating toolbar up. */
    readonly orientation?: VariantProp<"toolbar", "orientation">;
    /** `vibrant` takes the primary container colors. */
    readonly color?: VariantProp<"toolbar", "color">;
    readonly tokens?: InstanceTokens<"toolbar"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. Name the toolbar
 *  with `aria-label` or `aria-labelledby`. */
export interface ToolbarRootOwnProps extends ToolbarVariantProps {
    /** Clips the bar so it never grows past its parent: the ready-made toolbar then moves what
     *  doesn't fit into a menu. */
    readonly overflow?: boolean | undefined;
    /** The root's test id: a prefix (`edit` → `edit-root`), or by part. */
    readonly testId?: TestIdOverride<ToolbarPart> | undefined;
}

/** The keys of `ToolbarRootOwnProps`, which Root keeps off its element. */
export const TOOLBAR_ROOT_PROPS = [
    "placement",
    "orientation",
    "color",
    "tokens",
    "overflow",
    "testId",
] as const satisfies readonly (keyof ToolbarRootOwnProps)[];

/** One element of the ready-made toolbar, as data: an icon button when it has an icon (named by
 *  its label), else a text button. In the overflow menu it's an item with its label and icon. */
export interface ToolbarItem<Node = unknown> extends InteractionSourceProps {
    /** Its key, and its value in the overflow menu. */
    readonly value: string;
    /** The button's text, or an icon button's accessible name, and the menu item's label. */
    readonly label: string;
    readonly icon?: Node;
    readonly disabled?: boolean | undefined;
    /** Makes it a toggle, on while `selected`; in the menu, a checkbox item. */
    readonly selected?: boolean | undefined;
    readonly onSelectedChange?:
        | ((details: { readonly selected: boolean }) => void)
        | undefined;
    /** Called when it's pressed, in the row or in the menu. */
    readonly onClick?: (() => void) | undefined;
    readonly testId?: string | undefined;
}

/** What the ready-made toolbar renders inside Root. */
export interface ToolbarContentProps<Node> {
    /** The elements, in order. */
    readonly items?: readonly ToolbarItem<Node>[] | undefined;
    /** The overflow button's accessible name. @default "More options" */
    readonly overflowLabel?: string | undefined;
    /** The overflow button's icon. Three dots unless given. */
    readonly overflowIcon?: Node;
}

/** The keys of `ToolbarContentProps`. */
export const TOOLBAR_CONTENT_PROPS = [
    "items",
    "overflowLabel",
    "overflowIcon",
] as const satisfies readonly (keyof ToolbarContentProps<unknown>)[];

/** The overflow button's name when the ready-made toolbar isn't given one. */
export const TOOLBAR_OVERFLOW_LABEL = "More options";

/** The overflow button's test id prefix under the toolbar's: `edit` → `edit-overflow` (its root
 *  is `edit-overflow-root`). */
export const toolbarOverflowTestId = (testId: unknown): string =>
    `${typeof testId === "string" ? testId : "pf-toolbar"}-overflow`;

/** The toolbar's registry selection. `overflow` only when on, so a plain toolbar keeps its
 *  classes. */
export const toolbarSelection = (
    props: ToolbarRootOwnProps,
): Selection<"toolbar"> => ({
    placement: props.placement,
    orientation: props.orientation,
    color: props.color,
    overflow: props.overflow || undefined,
    tokens: props.tokens,
});

/** The icon button tokens an unstyled vibrant toolbar gives its icon buttons, or `undefined`.
 *  A styled toolbar's root sets them as custom properties, which inherit; an unstyled one draws
 *  none of its colors, so its binding provides them instead. The accent follows the toolbar's
 *  `content` token, if the app sets it, and otherwise the color the toolbar inherits. */
export const unstyledToolbarProvidedTokens = (
    color: unknown,
): ProvidedTokens | undefined =>
    color === "vibrant"
        ? {
              iconButton: {
                  accent: "var(--components-toolbar-content, currentColor)",
              },
          }
        : undefined;

/** Root's ARIA: a toolbar, with its orientation when vertical. */
export const toolbarRootProps = (props: ToolbarVariantProps) => ({
    role: "toolbar",
    "aria-orientation":
        props.orientation === "vertical" ? "vertical" : "horizontal",
});

/** Where the overflow menu opens: above a horizontal toolbar's end (toolbars sit low on the
 *  screen) or beside a vertical one's, flipping when there's no room. `fixed`, so the overflow
 *  toolbar's clipping doesn't cut it off. */
export const toolbarMenuPositioning = (orientation: unknown) => ({
    placement:
        orientation === "vertical"
            ? ("right-end" as const)
            : ("top-end" as const),
    strategy: "fixed" as const,
});

/** The overflow menu's items: each element past `count`, with its label and icon, a checkbox
 *  item when it's a toggle. */
export const toolbarMenuItems = <Node>(
    items: readonly ToolbarItem<Node>[],
    count: number,
): MenuItem<Node>[] =>
    items.slice(count).map((item) => ({
        value: item.value,
        label: item.label as Node,
        ...(item.icon === undefined ? {} : { leadingIcon: item.icon }),
        disabled: item.disabled,
        ...(item.selected === undefined
            ? {}
            : {
                  type: "checkbox" as const,
                  checked: item.selected,
                  onCheckedChange: (checked: boolean) =>
                      item.onSelectedChange?.({ selected: checked }),
              }),
    }));

/** Runs what choosing an overflow menu item does: its element's `onClick`. A toggle's change
 *  comes from the menu's `onCheckedChange`. */
export const toolbarMenuSelect = (
    items: readonly ToolbarItem<unknown>[],
    value: string,
): void => {
    items.find((item) => item.value === value)?.onClick?.();
};

const NEXT = { horizontal: "ArrowRight", vertical: "ArrowDown" } as const;
const PREVIOUS = { horizontal: "ArrowLeft", vertical: "ArrowUp" } as const;

/** Where a key moves focus among the toolbar's `count` elements from `index`, as a toolbar's
 *  arrow keys do: along its orientation (mirrored under `rtl` when horizontal), wrapping, and
 *  Home and End to the ends. `undefined` for other keys. */
export const toolbarKeyTarget = (
    key: string,
    index: number,
    count: number,
    orientation: "horizontal" | "vertical",
    dir: "ltr" | "rtl",
): number | undefined => {
    if (count === 0) return undefined;
    if (key === "Home") return 0;
    if (key === "End") return count - 1;
    const flip = orientation === "horizontal" && dir === "rtl";
    const forward = flip ? PREVIOUS[orientation] : NEXT[orientation];
    const back = flip ? NEXT[orientation] : PREVIOUS[orientation];
    if (key === forward) return (index + 1) % count;
    if (key === back) return (index - 1 + count) % count;
    return undefined;
};

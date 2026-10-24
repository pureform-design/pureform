// The navigation bar's and rail's contract, shared by every binding and by both components: the
// props Root takes for itself, how they map onto the selection and the navigation machine, the
// destinations the ready-made components take as data, and each destination's element props. A
// destination is a link when it has an `href`, else a button; the current one is marked with
// `aria-current`. The rail adds a header (its menu button and FAB), `expanded`, and `modal`, which
// the bindings draw in a dialog over a scrim.

import type {
    navigationBarAnatomy,
    navigationRailAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { ItemInstance, Unstyled } from "../parts";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import { selectItemGroups, type SelectItemGroup } from "./select";
import type { VariantProp } from "./variants";

/** The navigation components: Material's bar and rail, which share their parts and behavior. */
export type NavigationComponent = "navigationBar" | "navigationRail";

/** A navigation component's parts: `"root" | "item" | "indicator" | "activeIndicator" | "icon" |
 *  "label"`, and the rail's `"header"`. */
export type NavigationPart =
    | PartName<typeof navigationBarAnatomy>
    | PartName<typeof navigationRailAnatomy>;

/** A flag only the rail takes. */
type RailFlag<C extends NavigationComponent> = C extends "navigationRail"
    ? boolean | undefined
    : undefined;

/** A navigation component's variant groups and instance tokens. */
export interface NavigationVariantProps<C extends NavigationComponent> {
    readonly color?: VariantProp<C, "color">;
    /** The bar's: each label under its icon (`vertical`, the default) or beside it, inside the
     *  pill (`horizontal`), as in medium windows. */
    readonly itemLayout?: VariantProp<C, "itemLayout">;
    /** The rail's: wider, each label beside its icon inside the pill. M3 Expressive's
     *  replacement for the navigation drawer. @default modal */
    readonly expanded?: RailFlag<C>;
    /** The rail's: drawn over the page in a dialog, on a scrim, open while `open` is. A modal rail
     *  is expanded unless `expanded` says otherwise. */
    readonly modal?: RailFlag<C>;
    readonly tokens?: InstanceTokens<C> | undefined;
}

/** What a modal rail's dialog takes: whether it's open, and how it closes. */
export interface NavigationModalProps extends Controllable<"open", boolean> {
    /** @default true */
    readonly closeOnEscape?: boolean | undefined;
    /** Whether a click on the scrim closes it. @default true */
    readonly closeOnInteractOutside?: boolean | undefined;
}

/** The ids of the elements, for composition. The machine builds each destination's id from the
 *  component's id and the destination's value. */
export interface NavigationElementIds {
    readonly root?: string | undefined;
    readonly item?: ((value: string) => string) | undefined;
}

/** What the navigation machine takes from Root's props. The value is the current destination's,
 *  or `null`. */
export interface NavigationBehaviorProps extends Controllable<
    "value",
    string | null
> {
    /** Disables every destination. */
    readonly disabled?: boolean | undefined;
    /** Root's id; the machine finds the element by it.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: NavigationElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface NavigationRootOwnProps<C extends NavigationComponent>
    extends
        NavigationVariantProps<C>,
        NavigationBehaviorProps,
        NavigationModalProps,
        IndicationProps {
    /** A prefix for every part's test id (`main` → `main-item`), or ids by part. */
    readonly testId?: TestIdOverride<NavigationPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<NavigationPart> | undefined;
}

/** The keys of `NavigationRootOwnProps`, which Root keeps off its element. */
export const NAVIGATION_ROOT_PROPS = [
    "color",
    "itemLayout",
    "expanded",
    "modal",
    "open",
    "defaultOpen",
    "onOpenChange",
    "closeOnEscape",
    "closeOnInteractOutside",
    "tokens",
    "disabled",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof NavigationRootOwnProps<NavigationComponent>)[];

/** What a destination takes for itself, besides its element's own props. */
export interface NavigationItemOwnProps extends InteractionSourceProps {
    /** The value the component takes when this destination is chosen. */
    readonly value: string;
    /** Where it leads: the destination renders as a link (`<a>`); without it, a button. */
    readonly href?: string | undefined;
    /** Disables this destination only. */
    readonly disabled?: boolean | undefined;
}

/** The keys of `NavigationItemOwnProps`. `href` stays on the element. */
export const NAVIGATION_ITEM_PROPS = [
    "value",
    "disabled",
    "interactionSource",
] as const satisfies readonly (keyof NavigationItemOwnProps)[];

/** One destination of the ready-made components, as data; its label and icon in the framework's
 *  node type. */
export interface NavigationItem<Node = unknown> extends NavigationItemOwnProps {
    readonly label: Node;
    readonly icon?: Node;
    /** Flip the icon under `rtl`, for an icon that points. */
    readonly mirrorIcon?: boolean | undefined;
    /** The rail's section this destination belongs to. Destinations of one section sit
     *  together under one heading with this text, shown while the rail is expanded, in the order
     *  the sections first appear (like Select's `group`). The bar ignores it. */
    readonly section?: string | undefined;
}

/** The rail's destinations by `section`, through `selectItemGroups`: each run under one
 *  heading, `undefined` for destinations outside any section. */
export const navigationSections = <
    Item extends { readonly section?: string | undefined },
>(
    items: readonly Item[],
): SelectItemGroup<Item>[] => selectItemGroups(items, (item) => item.section);

/** What the ready-made components render inside Root, in the framework's node type. */
export interface NavigationContentProps<Node> {
    /** The destinations, in order. */
    readonly items?: readonly NavigationItem<Node>[] | undefined;
    /** The rail's header, above the destinations: a menu button and a FAB, say. The bar has
     *  none, and ignores it. */
    readonly header?: Node;
}

/** The keys of `NavigationContentProps`. */
export const NAVIGATION_CONTENT_PROPS = [
    "items",
    "header",
] as const satisfies readonly (keyof NavigationContentProps<unknown>)[];

/** The registry selection from Root's props. */
export const navigationSelection = <C extends NavigationComponent>(
    props: NavigationVariantProps<C>,
): Selection<C> => {
    const rail = props as unknown as NavigationVariantProps<"navigationRail">;
    const expanded = rail.expanded ?? rail.modal;
    return {
        color: props.color,
        ...(props.itemLayout === undefined
            ? {}
            : { itemLayout: props.itemLayout }),
        ...(expanded === undefined ? {} : { expanded }),
        ...(rail.modal === undefined ? {} : { modal: rail.modal }),
        tokens: props.tokens,
    } as unknown as Selection<C>;
};

/** Zag's dialog props for a modal rail, from Root's, besides `id`, `dir`, and the controllable
 *  `open`. The rail's `aria-label` names the dialog too. */
export const navigationModalMachineProps = (
    props: NavigationModalProps & {
        readonly "aria-label"?: string | undefined;
    },
) => ({
    modal: true,
    closeOnEscape: props.closeOnEscape,
    closeOnInteractOutside: props.closeOnInteractOutside,
    "aria-label": props["aria-label"],
});

/** What a modal rail's positioner adds to Zag's props: hidden while closed, and fixed along the
 *  start edge of the viewport, the rail's full height. Normalize it with the framework's
 *  `normalizeProps` and merge it after Zag's. */
export const navigationModalPositionerLayout = (open: boolean) => ({
    hidden: !open,
    style: {
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: "0",
        display: "flex",
    } as const,
});

/** What a modal rail's dialog surface adds to Zag's props: hidden while closed, the rail's full
 *  height. */
export const navigationModalContentLayout = (open: boolean) => ({
    hidden: !open,
    style: { display: "flex", height: "100%", outline: "none" } as const,
});

/** The navigation machine's props from Root's, besides `id`, `dir`, and the controllable `value`.
 *  Root's `id` becomes the machine's root id. */
export const navigationMachineProps = (props: NavigationBehaviorProps) => ({
    disabled: props.disabled,
    ids: { root: props.id ?? props.ids?.root, item: props.ids?.item },
});

/** The machine's item props for a destination: a link to a page says `aria-current="page"`, a
 *  button `"true"`. */
export const navigationItemMachineProps = (item: NavigationItemOwnProps) => ({
    value: item.value,
    disabled: item.disabled,
    current: item.href === undefined ? ("true" as const) : ("page" as const),
});

/** The element a destination renders: a link with an `href`, else a button. */
export const navigationItemElement = (item: NavigationItemOwnProps) =>
    item.href === undefined ? ("button" as const) : ("a" as const);

/** A destination's own element props: a button's `type` and `disabled`. A disabled link keeps its
 *  `href`, marked `aria-disabled`, and the machine stops its click. */
export const navigationItemElementProps = (
    item: NavigationItemOwnProps,
    disabled: boolean,
) =>
    item.href === undefined
        ? { type: "button" as const, disabled: disabled || undefined }
        : {};

/** What a ready-made navigation component's destination is, for a function of the copy in its
 *  `item`, `indicator`, `activeIndicator`, `icon` and `label` keys: its index and data, and
 *  whether it's the current one. */
export interface NavigationItemInstance<Node = unknown> extends ItemInstance<
    NavigationItem<Node>
> {
    readonly selected: boolean;
}

/** The ready-made navigation component's repeated parts, each to its destination. */
export interface NavigationInstances<Node = unknown> {
    readonly item: NavigationItemInstance<Node>;
    readonly indicator: NavigationItemInstance<Node>;
    readonly activeIndicator: NavigationItemInstance<Node>;
    readonly icon: NavigationItemInstance<Node>;
    readonly label: NavigationItemInstance<Node>;
}

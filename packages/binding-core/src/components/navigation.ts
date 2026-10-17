// The navigation bar's and rail's contract, shared by every binding and by both components: the
// props Root takes for itself, how they map onto the selection and the navigation machine, the
// destinations the ready-made components take as data, and each destination's element props. A
// destination is a link when it has an `href`, else a button; the current one is marked with
// `aria-current`.

import type {
    navigationBarAnatomy,
    navigationRailAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The navigation components: Material's bar and rail, which share their parts and behavior. */
export type NavigationComponent = "navigationBar" | "navigationRail";

/** A navigation component's parts: `"root" | "item" | "indicator" | "activeIndicator" | "icon" |
 *  "label"`. The bar's and the rail's are the same. */
export type NavigationPart =
    | PartName<typeof navigationBarAnatomy>
    | PartName<typeof navigationRailAnatomy>;

/** A navigation component's variant groups and instance tokens. */
export interface NavigationVariantProps<C extends NavigationComponent> {
    readonly color?: VariantProp<C, "color">;
    readonly tokens?: InstanceTokens<C> | undefined;
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
    /** Root's id; the machine finds the element by it. */
    readonly id?: string | undefined;
    readonly ids?: NavigationElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface NavigationRootOwnProps<C extends NavigationComponent>
    extends NavigationVariantProps<C>, NavigationBehaviorProps {
    /** A prefix for every part's test id (`main` → `main-item`), or ids by part. */
    readonly testId?: TestIdOverride<NavigationPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<NavigationPart> | undefined;
}

/** The keys of `NavigationRootOwnProps`, which Root keeps off its element. */
export const NAVIGATION_ROOT_PROPS = [
    "color",
    "tokens",
    "disabled",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof NavigationRootOwnProps<NavigationComponent>)[];

/** What a destination takes for itself, besides its element's own props. */
export interface NavigationItemOwnProps {
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
] as const satisfies readonly (keyof NavigationItemOwnProps)[];

/** One destination of the ready-made components, as data; its label and icon in the framework's
 *  node type. */
export interface NavigationItem<Node = unknown> extends NavigationItemOwnProps {
    readonly label: Node;
    readonly icon?: Node;
    /** Flip the icon under `rtl`, for an icon that points. */
    readonly mirrorIcon?: boolean | undefined;
}

/** What the ready-made components render inside Root, in the framework's node type. */
export interface NavigationContentProps<Node> {
    /** The destinations, in order. */
    readonly items?: readonly NavigationItem<Node>[] | undefined;
}

/** The keys of `NavigationContentProps`. */
export const NAVIGATION_CONTENT_PROPS = [
    "items",
] as const satisfies readonly (keyof NavigationContentProps<unknown>)[];

/** The registry selection from Root's props. */
export const navigationSelection = <C extends NavigationComponent>(
    props: NavigationVariantProps<C>,
): Selection<C> =>
    ({ color: props.color, tokens: props.tokens }) as Selection<C>;

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

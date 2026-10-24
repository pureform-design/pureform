// The tabs' contract, shared by every binding: the props Root takes for itself, how they map onto
// the selection and Zag's tabs machine, the tabs the ready-made component takes as data, and the
// adjustments to Zag's tab props. The bindings render Root (an unstyled element around the tab list
// and the panels), the tab list (the preset's `root` slot), each tab with its content (its icon,
// label, and indicator), and a panel per tab.

import type {
    PartName,
    tabsCompositeAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { ItemInstance, Unstyled } from "../parts";
import { isPresent, withoutControls } from "./content";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import { PAGE_TRANSITION_PROPS } from "./page-transition";
import type { PageTransitionProps } from "./page-transition";
import type { VariantProp } from "./variants";

/** The tabs' parts: `"root" | "list"` (the tab list) `| "tab" | "tabContent"` (around a tab's
 *  icon, label, and indicator) `| "icon" | "label" | "indicator" | "content"` (a panel). */
export type TabsPart = PartName<typeof tabsCompositeAnatomy>;

/** The tabs' variant groups and instance tokens. `icon` says the tabs have icons, which primary
 *  tabs stack over their labels unless `inlineIcon` sets them beside. */
export interface TabsVariantProps {
    readonly variant?: VariantProp<"tabs", "variant">;
    readonly icon?: boolean | undefined;
    /** Set a primary tab's icon beside its label rather than over it, in a 48px tab. Secondary
     *  tabs always do. @default false */
    readonly inlineIcon?: boolean | undefined;
    /** Tabs that size to their content (at least 90px) and scroll sideways, padded at the
     *  list's edges, for more tabs than fit. The selected tab scrolls into view. @default false */
    readonly scrollable?: boolean | undefined;
    readonly color?: VariantProp<"tabs", "color">;
    readonly tokens?: InstanceTokens<"tabs"> | undefined;
}

/** The ids of the tabs' elements, for composition. Zag builds each tab's and panel's id from the
 *  tabs' id and the tab's value. */
export interface TabsElementIds {
    readonly root?: string | undefined;
    readonly list?: string | undefined;
    readonly trigger?: ((value: string) => string) | undefined;
    readonly content?: ((value: string) => string) | undefined;
}

/** What Zag's tabs machine takes from Root's props. The value is the selected tab's, or `null`
 *  before one is. */
export interface TabsBehaviorProps extends Controllable<
    "value",
    string | null
> {
    /** `"automatic"` selects a tab as the arrow keys reach it; `"manual"` waits for Enter or
     *  Space. @default "automatic" */
    readonly activationMode?: "automatic" | "manual" | undefined;
    /** Whether the arrow keys go round from the last tab to the first. @default true */
    readonly loopFocus?: boolean | undefined;
    /** Disables every tab. */
    readonly disabled?: boolean | undefined;
    /** Root's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: TabsElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface TabsRootOwnProps
    extends TabsVariantProps, TabsBehaviorProps, IndicationProps {
    /** A prefix for every part's test id (`trips` → `trips-tab`), or ids by part. */
    readonly testId?: TestIdOverride<TabsPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<TabsPart> | undefined;
}

/** The keys of `TabsRootOwnProps`, which Root keeps off its element. */
export const TABS_ROOT_PROPS = [
    "variant",
    "icon",
    "inlineIcon",
    "scrollable",
    "color",
    "tokens",
    "activationMode",
    "loopFocus",
    "disabled",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof TabsRootOwnProps)[];

/** The props of the ready-made tabs that name the tab list, so they go on it rather than on Root:
 *  the list is what assistive technology reads as the group of tabs. */
export const TABS_LIST_LABEL_PROPS = ["aria-label", "aria-labelledby"] as const;

/** One tab of the ready-made tabs, as data; its label, icon, and panel in the framework's node
 *  type. */
export interface TabsItem<Node = unknown> extends InteractionSourceProps {
    readonly value: string;
    /** The tab's label. A tab without one shows only its icon, and its indicator spans the icon:
     *  name it with `aria-label`. */
    readonly label?: Node;
    /** The tab's accessible name, for a tab that shows only its icon. */
    readonly "aria-label"?: string | undefined;
    /** An icon with the label; any tab having one turns on the tabs' `icon` variant. */
    readonly icon?: Node;
    /** Flip the icon under `rtl`, for an icon that points. */
    readonly mirrorIcon?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** The panel the tab shows. Tabs with no panels switch something else (a route), and name no
     *  panel in `aria-controls`. */
    readonly content?: Node;
}

/** What the ready-made tabs render inside Root, in the framework's node type. */
export interface TabsContentProps<Node> extends PageTransitionProps {
    /** The tabs, in order. */
    readonly items?: readonly TabsItem<Node>[] | undefined;
}

/** The keys of `TabsContentProps`. */
export const TABS_CONTENT_PROPS = [
    "items",
    ...PAGE_TRANSITION_PROPS,
] as const satisfies readonly (keyof TabsContentProps<unknown>)[];

/** The tabs' registry selection from Root's props. */
export const tabsSelection = (props: TabsVariantProps): Selection<"tabs"> => ({
    variant: props.variant,
    icon: props.icon,
    inlineIcon: props.inlineIcon,
    scrollable: props.scrollable,
    color: props.color,
    tokens: props.tokens,
});

/** Zag's tabs props from Root's, besides `id`, `dir`, and the controllable `value`. Root's `id`
 *  becomes Zag's root id. */
export const tabsMachineProps = (props: TabsBehaviorProps) => ({
    activationMode: props.activationMode,
    loopFocus: props.loopFocus,
    ids: {
        root: props.id ?? props.ids?.root,
        list: props.ids?.list,
        trigger: props.ids?.trigger,
        content: props.ids?.content,
    },
});

/** Zag's tab props for one tab: without `data-ssr`, which Zag drops once it starts, so the
 *  server's markup and the hydrated page would disagree; without `aria-controls` when the tab has
 *  no panel to name. `disabled` is the tab's own or the tabs'. */
export const tabsTriggerProps = <P extends object>(
    props: P,
    { controls }: { readonly controls: boolean },
): Omit<P, "data-ssr"> => {
    const { "data-ssr": _ssr, ...rest } = props as P & { "data-ssr"?: unknown };
    return withoutControls(rest, controls);
};

/** Zag's item props for one tab, from the tab's props and the tabs' `disabled`. */
export const tabsItemProps = (
    item: { readonly value: string; readonly disabled?: boolean | undefined },
    tabsDisabled: boolean | undefined,
) => ({
    value: item.value,
    disabled: !!(item.disabled || tabsDisabled),
});

/** The ready-made tabs' default value: the given `defaultValue`, else (unless controlled) the
 *  first enabled tab's, since Material's tabs always have one selected and only the selected tab
 *  takes focus from Tab. */
export const tabsDefaultValue = (
    props: Pick<TabsBehaviorProps, "value" | "defaultValue">,
    items: readonly Pick<TabsItem, "value" | "disabled">[],
): string | null | undefined => {
    if (props.defaultValue !== undefined || props.value !== undefined) {
        return props.defaultValue;
    }
    return items.find((item) => !item.disabled)?.value;
};

/** Whether any tab of the ready-made tabs has an icon. */
export const tabsHaveIcons = (
    items: readonly Pick<TabsItem, "icon">[],
): boolean => items.some((item) => isPresent(item.icon));

/** Whether any tab of the ready-made tabs has a panel. */
export const tabsHavePanels = (
    items: readonly Pick<TabsItem, "content">[],
): boolean => items.some((item) => isPresent(item.content));

/** What a ready-made tabs' tab is, for a function of the tab in its per-tab keys: its `index`
 *  and `item`, and whether it's `selected`. A panel (`content`) is its tab's. */
export interface TabsTabInstance<Node = unknown> extends ItemInstance<
    TabsItem<Node>
> {
    readonly selected: boolean;
}

/** The ready-made tabs' repeated parts, each to its tab. */
export interface TabsInstances<Node = unknown> {
    readonly tab: TabsTabInstance<Node>;
    readonly tabContent: TabsTabInstance<Node>;
    readonly icon: TabsTabInstance<Node>;
    readonly label: TabsTabInstance<Node>;
    readonly indicator: TabsTabInstance<Node>;
    readonly content: TabsTabInstance<Node>;
}

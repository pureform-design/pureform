// The accordion's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's accordion machine, and the items the ready-made accordion takes as
// data. The bindings render Root (the preset's root), each item as a tile holding its header (a
// button: an optional leading icon, the title over an optional description, and the expand
// indicator) and its content.

import type {
    accordionAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { VariantProp } from "./variants";

/** The accordion's parts: `"root" | "item" | "trigger"` (an item's header) `| "leading" | "text"`
 *  (around the title and description) `| "title" | "description" | "indicator" | "content"`. */
export type AccordionPart = PartName<typeof accordionAnatomy>;

/** The accordion's variant groups and instance tokens. */
export interface AccordionVariantProps {
    readonly density?: VariantProp<"accordion", "density">;
    readonly tokens?: InstanceTokens<"accordion"> | undefined;
}

/** The ids of the accordion's elements, for composition. Zag builds each item's ids from the
 *  accordion's id and the item's value. */
export interface AccordionElementIds {
    readonly root?: string | undefined;
    readonly item?: ((value: string) => string) | undefined;
    readonly itemContent?: ((value: string) => string) | undefined;
    readonly itemTrigger?: ((value: string) => string) | undefined;
}

/** What Zag's accordion machine takes from Root's props. The value is the expanded items'. */
export interface AccordionBehaviorProps extends Controllable<
    "value",
    string[]
> {
    /** Whether more than one item can be expanded at once. @default false */
    readonly multiple?: boolean | undefined;
    /** Whether the expanded item collapses from its header when it's the only one. @default true */
    readonly collapsible?: boolean | undefined;
    /** Disables every item. */
    readonly disabled?: boolean | undefined;
    /** Root's id; the machine builds the other ids from it. */
    readonly id?: string | undefined;
    readonly ids?: AccordionElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface AccordionRootOwnProps
    extends AccordionVariantProps, AccordionBehaviorProps, IndicationProps {
    /** A prefix for every part's test id (`faq` → `faq-trigger`), or ids by part. */
    readonly testId?: TestIdOverride<AccordionPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<AccordionPart> | undefined;
}

/** The keys of `AccordionRootOwnProps`, which Root keeps off its element. */
export const ACCORDION_ROOT_PROPS = [
    "density",
    "tokens",
    "multiple",
    "collapsible",
    "disabled",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof AccordionRootOwnProps)[];

/** One item of the ready-made accordion, as data; its text, icon and content in the framework's
 *  node type. */
export interface AccordionItem<Node = unknown> extends InteractionSourceProps {
    readonly value: string;
    /** The header's title. */
    readonly title: Node;
    /** A line beside the title, under it. */
    readonly description?: Node;
    /** An icon before the title. */
    readonly leading?: Node;
    /** Flip the leading icon under `rtl`, for an icon that points. */
    readonly mirrorLeading?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    /** What the item shows while expanded. */
    readonly content?: Node;
}

/** What the ready-made accordion renders inside Root, in the framework's node type. */
export interface AccordionContentProps<Node> {
    /** The items, in order. */
    readonly items?: readonly AccordionItem<Node>[] | undefined;
}

/** The keys of `AccordionContentProps`. */
export const ACCORDION_CONTENT_PROPS = [
    "items",
] as const satisfies readonly (keyof AccordionContentProps<unknown>)[];

/** The accordion's registry selection from Root's props. */
export const accordionSelection = (
    props: AccordionVariantProps,
): Selection<"accordion"> => ({
    density: props.density,
    tokens: props.tokens,
});

/** Zag's accordion props from Root's, besides `id`, `dir`, and the controllable `value`. Root's
 *  `id` becomes Zag's root id. An item collapses from its header by default, as Angular's
 *  expansion panels do. */
export const accordionMachineProps = (props: AccordionBehaviorProps) => ({
    multiple: props.multiple,
    collapsible: props.collapsible ?? true,
    disabled: props.disabled,
    ids: {
        root: props.id ?? props.ids?.root,
        item: props.ids?.item,
        itemContent: props.ids?.itemContent,
        itemTrigger: props.ids?.itemTrigger,
    },
});

/** Zag's item props for one item, from the item's props and the accordion's `disabled`. */
export const accordionItemProps = (
    item: { readonly value: string; readonly disabled?: boolean | undefined },
    disabled: boolean | undefined,
) => ({
    value: item.value,
    disabled: !!(item.disabled || disabled),
});

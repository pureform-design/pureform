// The tooltip's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's tooltip machine. The bindings render Root (an unstyled element
// around the trigger and the tooltip), the trigger, Zag's positioner, and the tooltip's surface
// (`Content`), in place rather than in a portal.

import type {
    PartName,
    TestIdOverride,
    tooltipOverlayAnatomy,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { OverlayPositioning } from "./overlay";
import type { VariantProp } from "./variants";

/** The tooltip's parts: `"root" | "trigger" | "positioner" | "content"` (the surface) `| "subhead"
 *  | "supportingText" | "actions"`. */
export type TooltipPart = PartName<typeof tooltipOverlayAnatomy>;

/** The tooltip's variant groups and instance tokens: `plain`, a short label, or `rich`, with a
 *  subhead and actions. */
export interface TooltipVariantProps {
    readonly variant?: VariantProp<"tooltip", "variant">;
    readonly tokens?: InstanceTokens<"tooltip"> | undefined;
}

/** The ids of the tooltip's elements, for composition. */
export interface TooltipElementIds {
    readonly trigger?: string | undefined;
    readonly positioner?: string | undefined;
    readonly content?: string | undefined;
}

/** What the tooltip machine takes from Root's props. `open` is the tooltip's. */
export interface TooltipBehaviorProps extends Controllable<"open", boolean> {
    /** How long the pointer rests on the trigger before it opens, in milliseconds. @default 400 */
    readonly openDelay?: number | undefined;
    /** How long it stays after the pointer leaves, in milliseconds. @default 150 */
    readonly closeDelay?: number | undefined;
    /** Never opens. The trigger stays as it is. */
    readonly disabled?: boolean | undefined;
    /** Whether the pointer can move onto the tooltip and use it, as a rich tooltip's actions
     *  need. @default true for a rich tooltip, else false */
    readonly interactive?: boolean | undefined;
    /** @default true */
    readonly closeOnEscape?: boolean | undefined;
    /** Whether a click on the trigger closes it. @default true */
    readonly closeOnClick?: boolean | undefined;
    /** Where the tooltip opens. @default `{ placement: "bottom" }` */
    readonly positioning?: OverlayPositioning | undefined;
    readonly ids?: TooltipElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface TooltipRootOwnProps
    extends TooltipVariantProps, TooltipBehaviorProps {
    /** A prefix for every part's test id (`save` → `save-trigger`, `save-content`), or ids by
     *  part. */
    readonly testId?: TestIdOverride<TooltipPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<TooltipPart> | undefined;
}

/** The keys of `TooltipRootOwnProps`, which Root keeps off its element. */
export const TOOLTIP_ROOT_PROPS = [
    "variant",
    "tokens",
    "openDelay",
    "closeDelay",
    "disabled",
    "interactive",
    "closeOnEscape",
    "closeOnClick",
    "positioning",
    "ids",
    "open",
    "defaultOpen",
    "onOpenChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof TooltipRootOwnProps)[];

/** What the ready-made tooltip renders inside Root, in the framework's node type. */
export interface TooltipContentProps<Node> {
    /** The trigger's label: the ready-made tooltip renders its trigger as a button only when
     *  given. */
    readonly trigger?: Node;
    /** The text. A plain tooltip shows it on its own; a rich one, under the subhead. */
    readonly supportingText?: Node;
    /** A rich tooltip's title. */
    readonly subhead?: Node;
    /** A rich tooltip's actions: text buttons. */
    readonly actions?: Node;
}

/** The keys of `TooltipContentProps`. */
export const TOOLTIP_CONTENT_PROPS = [
    "trigger",
    "supportingText",
    "subhead",
    "actions",
] as const satisfies readonly (keyof TooltipContentProps<unknown>)[];

/** The tooltip's registry selection from Root's props. */
export const tooltipSelection = (
    props: TooltipVariantProps,
): Selection<"tooltip"> => ({
    variant: props.variant,
    tokens: props.tokens,
});

/** Whether the tooltip is rich: its variant says so. */
export const isRichTooltip = (props: TooltipVariantProps): boolean =>
    props.variant === "rich";

/** Whether the pointer can move onto the tooltip and use it: `interactive` when given, else
 *  whether it's rich. Otherwise it lets the pointer through, positioner and all. */
export const isInteractiveTooltip = (
    props: Pick<TooltipBehaviorProps, "interactive"> & TooltipVariantProps,
): boolean => props.interactive ?? isRichTooltip(props);

/** Zag's tooltip props from Root's, besides `id`, `dir`, and the controllable `open`. */
export const tooltipMachineProps = (
    props: TooltipBehaviorProps & TooltipVariantProps,
) => ({
    openDelay: props.openDelay,
    closeDelay: props.closeDelay,
    disabled: props.disabled,
    interactive: isInteractiveTooltip(props),
    closeOnEscape: props.closeOnEscape,
    closeOnClick: props.closeOnClick,
    positioning: { placement: "bottom" as const, ...props.positioning },
    ids: {
        trigger: props.ids?.trigger,
        positioner: props.ids?.positioner,
        content: props.ids?.content,
    },
});

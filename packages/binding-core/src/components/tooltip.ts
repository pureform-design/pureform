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

/** The tooltip's parts: `"root" | "trigger" | "positioner" | "content"` (the surface) `| "caret"
 *  | "supportingText"`. */
export type TooltipPart = PartName<typeof tooltipOverlayAnatomy>;

/** The tooltip's instance tokens. It has no variants: the rich tooltip is `richTooltip`. */
export interface TooltipVariantProps {
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
     *  need. @default false (true for the rich tooltip) */
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
    /** The text. */
    readonly supportingText?: Node;
    /** Whether to draw a caret pointing at the trigger. */
    readonly caret?: boolean | undefined;
}

/** The keys of `TooltipContentProps`. */
export const TOOLTIP_CONTENT_PROPS = [
    "trigger",
    "supportingText",
    "caret",
] as const satisfies readonly (keyof TooltipContentProps<unknown>)[];

/** The tooltip's registry selection from Root's props. */
export const tooltipSelection = (
    props: TooltipVariantProps,
): Selection<"tooltip"> => ({
    tokens: props.tokens,
});

/** Whether the pointer can move onto the tooltip and use it: `interactive` when given, else
 *  `byDefault` (false; the rich tooltip passes true). Otherwise it lets the pointer through,
 *  positioner and all. */
export const isInteractiveTooltip = (
    props: Pick<TooltipBehaviorProps, "interactive">,
    byDefault = false,
): boolean => props.interactive ?? byDefault;

// The rich tooltip's contract, shared by every binding: as the tooltip's, with a subhead and
// actions, and interactive by default. It runs on Zag's tooltip machine with `interactive` on
// (see the context of c2a for why it isn't Zag's popover or hover card).

import type {
    PartName,
    richTooltipOverlayAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { TooltipBehaviorProps } from "./tooltip";
import { isInteractiveTooltip } from "./tooltip";

/** The rich tooltip's parts: the tooltip's, and `"subhead" | "actions"`. */
export type RichTooltipPart = PartName<typeof richTooltipOverlayAnatomy>;

/** The rich tooltip's instance tokens. */
export interface RichTooltipVariantProps {
    readonly tokens?: InstanceTokens<"richTooltip"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface RichTooltipRootOwnProps
    extends RichTooltipVariantProps, TooltipBehaviorProps {
    /** A prefix for every part's test id, or ids by part. */
    readonly testId?: TestIdOverride<RichTooltipPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<RichTooltipPart> | undefined;
}

/** The keys of `RichTooltipRootOwnProps`, which Root keeps off its element. */
export const RICH_TOOLTIP_ROOT_PROPS = [
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
] as const satisfies readonly (keyof RichTooltipRootOwnProps)[];

/** What the ready-made rich tooltip renders inside Root, in the framework's node type. */
export interface RichTooltipContentProps<Node> {
    /** The trigger's label: rendered as a button only when given. */
    readonly trigger?: Node;
    readonly subhead?: Node;
    readonly supportingText?: Node;
    /** Text buttons. */
    readonly actions?: Node;
    /** Whether to draw a caret pointing at the trigger. */
    readonly caret?: boolean | undefined;
}

/** The keys of `RichTooltipContentProps`. */
export const RICH_TOOLTIP_CONTENT_PROPS = [
    "trigger",
    "subhead",
    "supportingText",
    "actions",
    "caret",
] as const satisfies readonly (keyof RichTooltipContentProps<unknown>)[];

/** The rich tooltip's registry selection from Root's props. */
export const richTooltipSelection = (
    props: RichTooltipVariantProps,
): Selection<"richTooltip"> => ({ tokens: props.tokens });

/** Whether the pointer can move onto it: `interactive` when given, else true. */
export const isInteractiveRichTooltip = (
    props: Pick<TooltipBehaviorProps, "interactive">,
): boolean => isInteractiveTooltip(props, true);

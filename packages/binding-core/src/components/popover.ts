// The popover's contract, shared by every binding: the props Root takes for itself and how they
// map onto the selection and Zag's popover machine. The bindings render Root (an unstyled element
// around the trigger and the popover), the trigger, Zag's positioner, and the popover's surface
// (`Content`), in place rather than in a portal. It opens on a press, takes focus, and closes on
// a press outside or Escape, returning focus to its trigger; `modal` also keeps focus inside and
// the page out of reach. The rich tooltip holds text and opens on hover or focus.

import type {
    PartName,
    popoverOverlayAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { OverlayPositioning } from "./overlay";

/** The popover's parts: `"root" | "trigger" | "positioner" | "content"` (the surface) `| "caret" |
 *  "title" | "body" | "actions" | "closeTrigger"`. */
export type PopoverPart = PartName<typeof popoverOverlayAnatomy>;

/** The popover's instance tokens. It has no variants. */
export interface PopoverVariantProps {
    readonly tokens?: InstanceTokens<"popover"> | undefined;
}

/** The ids of the popover's elements, for composition. */
export interface PopoverElementIds {
    readonly trigger?: string | undefined;
    readonly positioner?: string | undefined;
    readonly content?: string | undefined;
    /** The title, which names the popover. */
    readonly title?: string | undefined;
    /** The body, which describes it. */
    readonly body?: string | undefined;
    readonly closeTrigger?: string | undefined;
    readonly caret?: string | undefined;
}

/** What the popover machine takes from Root's props. `open` is the popover's. */
export interface PopoverBehaviorProps extends Controllable<"open", boolean> {
    /** Whether the rest of the page is out of reach while it's open: focus stays inside, the page
     *  doesn't scroll, and assistive technology reads only the popover. @default false */
    readonly modal?: boolean | undefined;
    /** Whether focus moves to the first focusable element inside when it opens. @default true */
    readonly autoFocus?: boolean | undefined;
    /** Whether a press outside closes it. @default true */
    readonly closeOnInteractOutside?: boolean | undefined;
    /** @default true */
    readonly closeOnEscape?: boolean | undefined;
    /** Whether focus goes back to the trigger once it closes. @default true */
    readonly restoreFocus?: boolean | undefined;
    /** Where it opens. @default `{ placement: "bottom-start" }` */
    readonly positioning?: OverlayPositioning | undefined;
    readonly ids?: PopoverElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface PopoverRootOwnProps
    extends PopoverVariantProps, PopoverBehaviorProps {
    /** A prefix for every part's test id (`filters` → `filters-trigger`, `filters-content`), or
     *  ids by part. */
    readonly testId?: TestIdOverride<PopoverPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<PopoverPart> | undefined;
}

/** The keys of `PopoverRootOwnProps`, which Root keeps off its element. */
export const POPOVER_ROOT_PROPS = [
    "tokens",
    "modal",
    "autoFocus",
    "closeOnInteractOutside",
    "closeOnEscape",
    "restoreFocus",
    "positioning",
    "ids",
    "open",
    "defaultOpen",
    "onOpenChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof PopoverRootOwnProps)[];

/** What the ready-made popover renders inside Root, in the framework's node type. */
export interface PopoverContentProps<Node> {
    /** The trigger's label: rendered as a button only when given. */
    readonly trigger?: Node;
    /** The heading, which names the popover. Not `title`, which is the element's own attribute. */
    readonly heading?: Node;
    /** What the popover holds: text, or a filter's or a small form's controls. */
    readonly body?: Node;
    /** Buttons, at the end. */
    readonly actions?: Node;
    /** Whether to draw a caret pointing at the trigger. */
    readonly caret?: boolean | undefined;
}

/** The keys of `PopoverContentProps`. */
export const POPOVER_CONTENT_PROPS = [
    "trigger",
    "heading",
    "body",
    "actions",
    "caret",
] as const satisfies readonly (keyof PopoverContentProps<unknown>)[];

/** The popover's registry selection from Root's props. */
export const popoverSelection = (
    props: PopoverVariantProps,
): Selection<"popover"> => ({ tokens: props.tokens });

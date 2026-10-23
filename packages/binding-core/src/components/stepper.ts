// The stepper's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's steps machine, the steps the ready-made component takes as data, and
// the adjustments to Zag's trigger props. The bindings render Root (an element around the list
// and, in a row, the content), the list, an item per step (its header, connector and, in a column,
// its content), the header's indicator, label and caption, and the content.

import type {
    PartName,
    stepperAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import { withoutControls } from "./content";
import { PAGE_TRANSITION_PROPS } from "./page-transition";
import type { PageTransitionProps } from "./page-transition";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { VariantProp } from "./variants";

/** The stepper's parts: `"root" | "list" | "item"` (a step) `| "trigger"` (its header)
 *  `| "indicator" | "label" | "caption"` (the header's optional text) `| "separator"` (the
 *  connector) `| "content"`. */
export type StepperPart = PartName<typeof stepperAnatomy>;

/** The stepper's variant groups and instance tokens. `orientation` is also the machine's. */
export interface StepperVariantProps {
    /** A row of steps, or a column with each step's content beside its connector.
     *  @default "horizontal" */
    readonly orientation?: VariantProp<"stepper", "orientation">;
    readonly density?: VariantProp<"stepper", "density">;
    readonly tokens?: InstanceTokens<"stepper"> | undefined;
}

/** The ids of the stepper's elements, for composition. Zag builds each header's and content's id
 *  from the stepper's id and the step's index. */
export interface StepperElementIds {
    readonly root?: string | undefined;
    readonly list?: string | undefined;
    readonly trigger?: ((index: number) => string) | undefined;
    readonly content?: ((index: number) => string) | undefined;
}

/** What Zag's steps machine takes from Root's props. The step is the index of the current one; a
 *  step equal to `count` means every step is done. */
export interface StepperBehaviorProps extends Controllable<"step", number> {
    /** The number of steps. */
    readonly count?: number | undefined;
    /** Whether the steps have to be done in order: the headers don't go to a step, only the next
     *  and previous triggers do. @default false */
    readonly linear?: boolean | undefined;
    /** Whether a step is valid. An invalid current step blocks going forward from it. */
    readonly isStepValid?: ((index: number) => boolean) | undefined;
    /** Whether a step can be skipped: going forward from it needs no validity. */
    readonly isStepSkippable?: ((index: number) => boolean) | undefined;
    /** Called when going forward was blocked by an invalid step. */
    readonly onStepInvalid?:
        | ((details: {
              readonly step: number;
              readonly action: "next" | "set";
              readonly targetStep?: number | undefined;
          }) => void)
        | undefined;
    /** Called when the last step is done. */
    readonly onStepComplete?: (() => void) | undefined;
    /** Root's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: StepperElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface StepperRootOwnProps
    extends StepperVariantProps, StepperBehaviorProps, IndicationProps {
    /** A prefix for every part's test id, or ids by part. */
    readonly testId?: TestIdOverride<StepperPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<StepperPart> | undefined;
}

/** The keys of `StepperRootOwnProps`, which Root keeps off its element. */
export const STEPPER_ROOT_PROPS = [
    "orientation",
    "density",
    "tokens",
    "count",
    "linear",
    "isStepValid",
    "isStepSkippable",
    "onStepInvalid",
    "onStepComplete",
    "id",
    "ids",
    "step",
    "defaultStep",
    "onStepChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof StepperRootOwnProps)[];

/** The props of the ready-made stepper that name the step list, so they go on it rather than on
 *  Root: the list is what assistive technology reads as the group of steps. */
export const STEPPER_LIST_LABEL_PROPS = [
    "aria-label",
    "aria-labelledby",
] as const;

/** One step of the ready-made stepper, as data; its texts, icon and content in the framework's node
 *  type. */
export interface StepperItem<Node = unknown> extends InteractionSourceProps {
    /** The step's name, in its header. */
    readonly label?: Node;
    /** The header's optional second line, such as "Optional". */
    readonly caption?: Node;
    /** What the indicator shows while the step isn't done, in place of its number. */
    readonly icon?: Node;
    /** The step's accessible name, for a step with no label. */
    readonly "aria-label"?: string | undefined;
    /** What shows while the step is current. */
    readonly content?: Node;
    /** Shows the step in the error state: a warning in its indicator, and the error colors. */
    readonly error?: boolean | undefined;
    /** Whether a step that is done can be gone back to by its header. @default true */
    readonly editable?: boolean | undefined;
    readonly disabled?: boolean | undefined;
}

/** What the ready-made stepper renders inside Root, in the framework's node type. */
export interface StepperContentProps<Node> extends PageTransitionProps {
    /** The steps, in order. */
    readonly items?: readonly StepperItem<Node>[] | undefined;
}

/** The keys of `StepperContentProps`. */
export const STEPPER_CONTENT_PROPS = [
    "items",
    ...PAGE_TRANSITION_PROPS,
] as const satisfies readonly (keyof StepperContentProps<unknown>)[];

/** The stepper's registry selection from Root's props. */
export const stepperSelection = (
    props: StepperVariantProps,
): Selection<"stepper"> => ({
    orientation: props.orientation,
    density: props.density,
    tokens: props.tokens,
});

/** Zag's steps props from Root's, besides `id`, `dir` and the controllable `step`. Root's `id`
 *  becomes Zag's root id. */
export const stepperMachineProps = (
    props: StepperBehaviorProps & StepperVariantProps,
) => ({
    count: props.count,
    linear: props.linear,
    isStepValid: props.isStepValid,
    isStepSkippable: props.isStepSkippable,
    onStepInvalid: props.onStepInvalid,
    onStepComplete: props.onStepComplete,
    // Zag's `orientation` is the variant's; a value the registry doesn't know lays out as a row.
    orientation:
        props.orientation === "vertical"
            ? ("vertical" as const)
            : ("horizontal" as const),
    ids: {
        root: props.id ?? props.ids?.root,
        list: props.ids?.list,
        triggerId: props.ids?.trigger,
        contentId: props.ids?.content,
    },
});

/** Zag's trigger props for one step, without the `aria-controls` that names its content when the
 *  step has none. */
export const stepperTriggerProps = <P extends object>(
    props: P,
    { controls }: { readonly controls: boolean },
): P => withoutControls(props, controls);

/** Whether a header can't be pressed: it's the step's own `disabled`, or the step is done and not
 *  `editable`. */
export const stepperTriggerDisabled = (
    item: Pick<StepperItem, "disabled" | "editable">,
    completed: boolean,
): boolean => !!item.disabled || (completed && item.editable === false);

/** What the indicator shows, by step: an error, a done step's check, the step's own icon, or its
 *  number. */
export type StepperIndicator = "error" | "check" | "icon" | "number";

/** The indicator's content for a step. An error shows over everything, then a done step's check. */
export const stepperIndicator = (
    item: Pick<StepperItem, "error">,
    state: { readonly completed: boolean; readonly hasIcon: boolean },
): StepperIndicator =>
    item.error
        ? "error"
        : state.completed
          ? "check"
          : state.hasIcon
            ? "icon"
            : "number";

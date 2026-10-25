// The stepper: a list of steps, each an item with a pressable header (an indicator, a label and
// an optional caption), a connector to the next, and, in a column, its content; in a row the
// current step's content follows the list. `step` is the current step (controllable); a done
// step's indicator is a check, one in `error` a warning. Native has no keyboard stepping, nor
// the next and previous triggers: move between steps with `step`.

import { stepperAnatomy } from "@pureform/anatomy";
import type { IndicationAnatomy, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    stepperIndicator,
    stepperSelection,
    stepperTriggerDisabled,
    TOAST_GLYPHS,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    PageTransitionProps,
    StepperInstances,
    StepperItem,
    StepperPart,
    StepperStepInstance,
    StepperVariantProps,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import type { ReactNode } from "react";

import { Expanding } from "../expand";
import { FadeThrough } from "../fade-through/fade-through";
import type { FadeThroughProps } from "../fade-through/fade-through";
import { HorizontalSharedAxis } from "../horizontal-shared-axis/horizontal-shared-axis";
import type { HorizontalSharedAxisProps } from "../horizontal-shared-axis/horizontal-shared-axis";
import { IconSlot, iconSlot } from "../icon-style";
import { ownText } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, useControllable, withEngine } from "../parts";
import { resolveText } from "../resolve-text";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { PartSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import type { ComponentSlots } from "../styles";

const TRIGGER_INDICATION = stepperAnatomy.indication![0] as IndicationAnatomy;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface StepperHosts {
    readonly item: "View";
    readonly trigger: "Pressable";
    readonly indicator: "View";
    readonly label: "Text";
    readonly caption: "Text";
    readonly separator: "View";
    readonly content: "View";
    readonly root: "View";
    readonly list: "View";
}

/** The stepper's props, with `style` and `slotProps` keyed by part (a step's parts also by step,
 *  `StepperStepInstance`). */
export interface StepperProps
    extends
        StepperVariantProps,
        PageTransitionProps,
        NativeSlotProps<StepperHosts, StepperInstances<ReactNode>> {
    /** The steps, in order. */
    readonly items: readonly StepperItem<ReactNode>[];
    /** The current step: its index, or the number of steps once every one is done. */
    readonly step?: number | undefined;
    readonly defaultStep?: number | undefined;
    readonly onStepChange?:
        | ((details: ChangeDetails<"step", number>) => void)
        | undefined;
    /** Whether the steps have to be done in order: the headers don't go to a step. */
    readonly linear?: boolean | undefined;
    /** The step list's name, for assistive technology. */
    readonly "aria-label"?: string | undefined;
    readonly indication?: Indication | undefined;
    readonly testId?: TestIdOverride<StepperPart> | undefined;
    /** The fade through's own props, for `transition="fadeThrough"`. */
    readonly fadeThroughProps?:
        | Omit<FadeThroughProps, "value" | "children">
        | undefined;
    /** The shared axis's own props, for `transition="sharedAxis"`. */
    readonly horizontalSharedAxisProps?:
        | Omit<HorizontalSharedAxisProps, "index" | "scrim" | "children">
        | undefined;
}

interface StepProps {
    readonly item: StepperItem<ReactNode>;
    readonly index: number;
    readonly count: number;
    readonly step: number;
    readonly vertical: boolean;
    readonly linear: boolean;
    readonly selection: Record<string, unknown>;
    readonly indication: Indication | undefined;
    readonly onPress: (index: number) => void;
    readonly testId: TestIdOverride<StepperPart> | undefined;
    readonly slot: PartSlots;
}

function StepImpl({
    item,
    index,
    count,
    step,
    vertical,
    linear,
    selection,
    indication: given,
    onPress,
    testId,
    slot,
}: StepProps): ReactNode {
    const current = index === step;
    const completed = index < step;
    const disabled = linear || stepperTriggerDisabled(item, completed);
    const indication = useSurfaceIndication(TRIGGER_INDICATION, {
        indication: given,
        interactionSource: item.interactionSource,
        disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    }: ComponentSlots<StepperPart> = useComponentSlots<StepperPart>(
        "stepper",
        indication.select(selection),
        indication.states({
            selected: current,
            checked: completed,
            invalid: !!item.error,
            ...(disabled ? { disabled: true } : {}),
        }),
    );
    const id = (part: StepperPart) => testIdOf(stepperAnatomy, part, testId);
    const each = stepOf(slot, item, index, step);
    const kind = stepperIndicator(item, {
        completed,
        hasIcon: isPresent(item.icon),
    });
    const glyph =
        kind === "error"
            ? TOAST_GLYPHS.warning
            : kind === "check"
              ? TOAST_GLYPHS.success
              : kind === "icon"
                ? item.icon
                : String(index + 1);
    return (
        <v.item.View
            {...slot.props("item", each)}
            role={vertical ? "listitem" : "presentation"}
            style={slot.style("item", s.item, each)}
            testID={id("item")}
        >
            <v.trigger.Pressable
                {...slot.props("trigger", each)}
                {...slot.with("trigger", indication.handlers, each)}
                {...(vertical
                    ? {
                          role: "button" as const,
                          "aria-expanded": current,
                          "aria-current": current
                              ? ("step" as const)
                              : undefined,
                      }
                    : { role: "tab" as const, "aria-selected": current })}
                {...(item["aria-label"] === undefined
                    ? {}
                    : { "aria-label": item["aria-label"] })}
                disabled={disabled}
                onPress={slot.on(
                    "trigger",
                    "onPress",
                    () => onPress(index),
                    each,
                )}
                style={slot.style("trigger", withUnselectable(s.trigger), each)}
                testID={id("trigger")}
            >
                <v.indicator.View
                    {...slot.props("indicator", each)}
                    aria-hidden
                    style={slot.style("indicator", s.indicator, each)}
                    testID={id("indicator")}
                >
                    <IconSlot
                        {...iconSlot(selected, "indicator")}
                        motion={s.indicator}
                    >
                        {glyph}
                    </IconSlot>
                </v.indicator.View>
                {isPresent(item.label) ? (
                    <v.label.Text
                        {...slot.props("label", each)}
                        selectable={false}
                        style={slot.style("label", s.label, each)}
                        testID={id("label")}
                    >
                        {item.label}
                    </v.label.Text>
                ) : null}
                {isPresent(item.caption) ? (
                    <v.caption.Text
                        {...slot.props("caption", each)}
                        selectable={false}
                        style={slot.style("caption", s.caption, each)}
                        testID={id("caption")}
                    >
                        {item.caption}
                    </v.caption.Text>
                ) : null}
                {indication.layer(selected)}
            </v.trigger.Pressable>
            {index < count - 1 ? (
                <v.separator.View
                    {...slot.props("separator", each)}
                    style={slot.style("separator", s.separator, each)}
                    testID={id("separator")}
                />
            ) : null}
            {vertical && isPresent(item.content) ? (
                <Expanding open={current}>
                    <v.content.View
                        {...slot.props("content", each)}
                        style={slot.style("content", s.content, each)}
                        testID={id("content")}
                    >
                        {resolveText(
                            item.content,
                            v.content,
                            ownText(s.content),
                        )}
                    </v.content.View>
                </Expanding>
            ) : null}
        </v.item.View>
    );
}

const Step = withEngine(StepImpl, "StepperStep");

const STEP_PARTS = [
    "item",
    "trigger",
    "indicator",
    "label",
    "caption",
    "separator",
    "content",
] as const;

// A step for a function of the copy in a per-step key, when one is passed.
const stepOf = (
    slot: PartSlots,
    item: StepperItem<ReactNode>,
    index: number,
    step: number,
): StepperStepInstance<ReactNode> | undefined =>
    STEP_PARTS.some((part) => slot.each(part))
        ? {
              index,
              item,
              completed: index < step,
              current: index === step,
              error: !!item.error,
          }
        : undefined;

function StepperImpl(props: StepperProps): ReactNode {
    const selection = stepperSelection(props);
    const { styles: s, views: v } = useComponentSlots<StepperPart>(
        "stepper",
        selection,
    );
    const [step, setStep] = useControllable(
        "Stepper",
        "step",
        props.step,
        props.defaultStep,
        props.onStepChange,
        0,
    );
    const id = (part: StepperPart) =>
        testIdOf(stepperAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const vertical = props.orientation === "vertical";
    const content = props.items[step]?.content;
    const current = props.items[step];
    const shown = current ? stepOf(slot, current, step, step) : undefined;
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            <v.list.View
                {...slot.props("list")}
                role={vertical ? "list" : "tablist"}
                {...(props["aria-label"] === undefined
                    ? {}
                    : { "aria-label": props["aria-label"] })}
                style={slot.style("list", s.list)}
                testID={id("list")}
            >
                {props.items.map((item, index) => (
                    <Step
                        key={index}
                        item={item}
                        index={index}
                        count={props.items.length}
                        step={step}
                        vertical={vertical}
                        linear={!!props.linear}
                        selection={selection}
                        indication={props.indication}
                        onPress={setStep}
                        testId={props.testId}
                        slot={slot}
                    />
                ))}
            </v.list.View>
            {!vertical &&
            (props.transition === "sharedAxis" ||
                props.transition === "fadeThrough") ? (
                // A row's content slides between the steps in their order, or fades through.
                (() => {
                    const page = isPresent(content) ? (
                        <v.content.View
                            {...slot.props("content", shown)}
                            style={slot.style("content", s.content, shown)}
                            testID={id("content")}
                        >
                            {resolveText(
                                content,
                                v.content,
                                ownText(s.content),
                            )}
                        </v.content.View>
                    ) : null;
                    return props.transition === "fadeThrough" ? (
                        <FadeThrough {...props.fadeThroughProps} value={step}>
                            {page}
                        </FadeThrough>
                    ) : (
                        <HorizontalSharedAxis
                            {...props.horizontalSharedAxisProps}
                            index={step}
                            scrim={props.transitionScrim}
                        >
                            {page}
                        </HorizontalSharedAxis>
                    );
                })()
            ) : !vertical && isPresent(content) ? (
                <v.content.View
                    {...slot.props("content", shown)}
                    style={slot.style("content", s.content, shown)}
                    testID={id("content")}
                >
                    {resolveText(content, v.content, ownText(s.content))}
                </v.content.View>
            ) : null}
        </v.root.View>
    );
}

/** The stepper: `<Stepper aria-label="Checkout" items={[{ label: "Address", content: … }, …]} />`,
 *  `orientation` `horizontal` (the default) or `vertical`. */
export const Stepper = withEngine(StepperImpl, "Stepper");

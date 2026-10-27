// The number field: a text field for a number with a decrement and an increment button at its end.
// React Native has no Zag machine, so binding-core's arithmetic runs here: the text is parsed in
// the locale, a step stops at the limits, leaving the field clamps and formats the value, and
// holding a button repeats (after 300ms, every 50ms), as Zag's does on the web.

import { numberFieldAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    NUMBER_FIELD_LABELS,
    NUMBER_FIELD_SPIN_DELAY,
    NUMBER_FIELD_SPIN_INTERVAL,
    numberFieldCanStep,
    numberFieldClamp,
    numberFieldFormat,
    numberFieldOutOfRange,
    numberFieldParse,
    numberFieldPlaceholder,
    numberFieldRange,
    numberFieldSelection,
    numberFieldStep,
} from "@pureform/binding-core";
import type {
    IndicationProps,
    NumberFieldBehaviorProps,
    NumberFieldContentProps,
    NumberFieldPart,
    NumberFieldRange,
    NumberFieldVariantProps,
} from "@pureform/binding-core";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, useStableCallback, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** React Native Web draws a field that isn't editable as `readonly`; a disabled one is `disabled`
 *  there instead, as the web bindings draw it. */
const WEB = Platform.OS === "web";

const INDICATIONS = Object.fromEntries(
    numberFieldAnatomy.indication.map((entry) => [entry.trigger, entry]),
);

/** What each part renders as, for its keyed `style` and `slotProps`; React Native's own
 *  `TextInput` props go in `slotProps.input`. */
export interface NumberFieldHosts {
    readonly root: "View";
    readonly container: "View";
    readonly leadingIcon: "View";
    readonly prefixText: "Text";
    readonly suffixText: "Text";
    readonly input: "TextInput";
    readonly label: "Text";
    readonly control: "View";
    readonly decrementTrigger: "Pressable";
    readonly incrementTrigger: "Pressable";
    readonly supportingText: "Text";
}

export interface NumberFieldProps
    extends
        Omit<
            NumberFieldVariantProps,
            "leadingIcon" | "prefixText" | "suffixText"
        >,
        Pick<
            NumberFieldBehaviorProps,
            | "value"
            | "defaultValue"
            | "onValueChange"
            | "min"
            | "max"
            | "step"
            | "allowOverflow"
            | "spinOnPress"
            | "locale"
            | "formatOptions"
            | "disabled"
            | "invalid"
            | "error"
            | "readOnly"
            | "placeholder"
            | "decrementLabel"
            | "incrementLabel"
        >,
        NumberFieldContentProps<ReactNode>,
        IndicationProps,
        NativeSlotProps<NumberFieldHosts> {
    /** A prefix for every part's test id (`qty` → `qty-input`), or ids by part. */
    readonly testId?: TestIdOverride<NumberFieldPart> | undefined;
}

interface TriggerOptions {
    readonly props: NumberFieldProps;
    readonly part: "decrementTrigger" | "incrementTrigger";
    readonly disabled: boolean;
    readonly onStep: () => void;
    readonly children: ReactNode;
}

const id = (part: NumberFieldPart, props: NumberFieldProps) =>
    testIdOf(numberFieldAnatomy, part, props.testId);

// One button: a press steps once, and holding it keeps stepping until it's let go or disabled.
function TriggerImpl(options: TriggerOptions): ReactNode {
    const { props, part, disabled } = options;
    const slot = nativeSlots(props);
    const indication = useSurfaceIndication(INDICATIONS[part]!, {
        indication: props.indication,
        disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<NumberFieldPart>(
        "numberField",
        indication.select(
            numberFieldSelection({
                ...props,
                leadingIcon: isPresent(props.leadingIcon),
                prefixText: isPresent(props.prefixText),
                suffixText: isPresent(props.suffixText),
            }),
        ),
        indication.states(disabled ? { disabled: true } : {}),
    );
    const step = useStableCallback(options.onStep);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const stop = () => {
        clearTimeout(timer.current);
        clearInterval(timer.current);
        timer.current = undefined;
    };
    useEffect(() => stop, []);
    useEffect(() => {
        if (disabled) stop();
    }, [disabled]);
    const Slot = v[part];
    return (
        <Slot.Pressable
            {...slot.props(part)}
            {...slot.with(part, indication.handlers)}
            role="button"
            aria-label={
                part === "decrementTrigger"
                    ? (props.decrementLabel ?? NUMBER_FIELD_LABELS.decrement)
                    : (props.incrementLabel ?? NUMBER_FIELD_LABELS.increment)
            }
            disabled={disabled}
            // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
            onPressIn={slot.on(part, "onPressIn", (event: unknown) => {
                indication.handlers.onPressIn?.(event as never);
                if (disabled) return;
                step();
                if (props.spinOnPress === false) return;
                timer.current = setTimeout(() => {
                    timer.current = setInterval(
                        step,
                        NUMBER_FIELD_SPIN_INTERVAL,
                    );
                }, NUMBER_FIELD_SPIN_DELAY);
            })}
            // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
            onPressOut={slot.on(part, "onPressOut", (event: unknown) => {
                indication.handlers.onPressOut?.(event as never);
                stop();
            })}
            style={slot.style(part, withUnselectable(s[part]))}
            testID={id(part, props)}
        >
            <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                {options.children}
            </IconSlot>
            {indication.layer(selected)}
        </Slot.Pressable>
    );
}

const Trigger = withEngine(TriggerImpl, "NumberFieldTrigger");

function NumberFieldImpl(props: NumberFieldProps): ReactNode {
    const locale = props.locale;
    const options = props.formatOptions;
    const range: NumberFieldRange = numberFieldRange(props);
    const controlled = props.value !== undefined;
    const [own, setOwn] = useState(props.defaultValue ?? "");
    const value = controlled ? (props.value ?? "") : own;
    // The text while it's typed; the value once it's left.
    const [text, setText] = useState<string | undefined>(undefined);
    const [focused, setFocused] = useState(false);
    const shown = text ?? value;
    const number = numberFieldParse(shown, locale, options);

    const commit = (next: number) => {
        const formatted = numberFieldFormat(next, locale, options);
        setText(undefined);
        if (!controlled) setOwn(formatted);
        if (formatted !== value)
            props.onValueChange?.({ value: formatted, valueAsNumber: next });
    };
    // A held button steps from the latest value, not the one its press began with.
    const latest = useRef(number);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    latest.current = number;
    const stepBy = (direction: 1 | -1) => {
        const next = numberFieldStep(latest.current, direction, range);
        latest.current = next;
        commit(next);
    };

    const editable = !props.disabled && !props.readOnly;
    const invalid =
        (props.invalid ?? false) ||
        props.error !== undefined ||
        numberFieldOutOfRange(number, range);
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<NumberFieldPart>(
        "numberField",
        numberFieldSelection({
            ...props,
            leadingIcon: isPresent(props.leadingIcon),
            prefixText: isPresent(props.prefixText),
            suffixText: isPresent(props.suffixText),
        }),
        {
            focus: focused,
            focusVisible: focused,
            filled: shown !== "",
            invalid,
            disabled: props.disabled ?? false,
            ...(props.readOnly ? { readOnly: true } : {}),
            ...(props.mirrorLeadingIcon ? { mirrored: true } : {}),
        },
    );
    const slot = nativeSlots(props);
    const affix = (part: "prefixText" | "suffixText", node: ReactNode) => {
        if (!isPresent(node)) return null;
        const Slot = v[part];
        return (
            <Slot.Text
                {...slot.props(part)}
                selectable={false}
                style={slot.style(part, s[part])}
                testID={id(part, props)}
            >
                {node}
            </Slot.Text>
        );
    };
    const supporting = props.error ?? props.supportingText;
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={id("root", props)}
        >
            <v.container.View
                {...slot.props("container")}
                style={slot.style("container", s.container)}
                testID={id("container", props)}
            >
                {isPresent(props.leadingIcon) ? (
                    <v.leadingIcon.View
                        {...slot.props("leadingIcon")}
                        style={slot.style("leadingIcon", s.leadingIcon)}
                        testID={id("leadingIcon", props)}
                    >
                        <IconSlot
                            {...iconSlot(selected, "leadingIcon")}
                            motion={s.leadingIcon}
                        >
                            {props.leadingIcon}
                        </IconSlot>
                    </v.leadingIcon.View>
                ) : null}
                {affix("prefixText", props.prefixText)}
                <v.input.TextInput
                    {...slot.props("input")}
                    keyboardType="decimal-pad"
                    value={shown}
                    onChangeText={slot.on("input", "onChangeText", setText)}
                    onFocus={slot.on("input", "onFocus", () =>
                        setFocused(true),
                    )}
                    onBlur={slot.on("input", "onBlur", () => {
                        setFocused(false);
                        if (text === undefined) return;
                        const parsed = numberFieldParse(text, locale, options);
                        commit(
                            props.allowOverflow
                                ? parsed
                                : numberFieldClamp(parsed, range),
                        );
                    })}
                    editable={editable || (WEB && !!props.disabled)}
                    {...(WEB && props.disabled
                        ? ({ disabled: true } as object)
                        : {})}
                    placeholder={numberFieldPlaceholder(props.placeholder)}
                    role="spinbutton"
                    aria-valuemin={props.min}
                    aria-valuemax={props.max}
                    aria-valuenow={Number.isNaN(number) ? undefined : number}
                    {...(typeof props.label === "string"
                        ? { "aria-label": props.label }
                        : {})}
                    aria-invalid={invalid}
                    style={slot.style("input", s.input)}
                    testID={id("input", props)}
                />
                {affix("suffixText", props.suffixText)}
                <v.label.Text
                    {...slot.props("label")}
                    selectable={false}
                    pointerEvents="none"
                    style={slot.style("label", s.label)}
                    testID={id("label", props)}
                >
                    {props.label}
                </v.label.Text>
                <v.control.View
                    {...slot.props("control")}
                    role="group"
                    style={slot.style("control", s.control)}
                    testID={id("control", props)}
                >
                    <Trigger
                        props={props}
                        part="decrementTrigger"
                        disabled={
                            !editable || !numberFieldCanStep(number, -1, range)
                        }
                        onStep={() => stepBy(-1)}
                    >
                        {isPresent(props.decrementIcon)
                            ? props.decrementIcon
                            : "−"}
                    </Trigger>
                    <Trigger
                        props={props}
                        part="incrementTrigger"
                        disabled={
                            !editable || !numberFieldCanStep(number, 1, range)
                        }
                        onStep={() => stepBy(1)}
                    >
                        {isPresent(props.incrementIcon)
                            ? props.incrementIcon
                            : "+"}
                    </Trigger>
                </v.control.View>
            </v.container.View>
            {isPresent(supporting) ? (
                <v.supportingText.Text
                    {...slot.props("supportingText")}
                    style={slot.style("supportingText", s.supportingText)}
                    testID={id("supportingText", props)}
                >
                    {supporting}
                </v.supportingText.Text>
            ) : null}
        </v.root.View>
    );
}

/** A text field for a number, with decrement and increment buttons:
 *  `<NumberField label="Quantity" min={0} max={10} defaultValue="1" />`. The value is text in
 *  the locale; leaving the field clamps and formats it, and holding a button repeats. */
export const NumberField = withEngine(NumberFieldImpl, "NumberField");

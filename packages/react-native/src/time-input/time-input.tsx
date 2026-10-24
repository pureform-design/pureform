// The time input on React Native: the headline, the hour and minute typed into two fields (each a
// number-pad text input over its label), the period selector in a 12-hour cycle, and the actions.
// A field takes what's typed once it reads as an hour or a minute.

import { timeInputAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    TIME_INPUT_HEADLINE,
    timeInputSelection,
} from "@pureform/binding-core";
import type {
    TimeBehaviorProps,
    TimeContentProps,
    TimeInputPart,
    TimeInputRootOwnProps,
    TimePickerView,
} from "@pureform/binding-core";
import {
    displayValue,
    parseField,
    periodOf,
    stepTime,
    timeKeyStep,
    withPeriod,
} from "@pureform/machines/time-picker";
import type { HourCycle, Time } from "@pureform/machines/time-picker";
import { Fragment, type ReactNode, useState } from "react";
import type { TextInputKeyPressEvent } from "react-native";

import { testIdOf, withEngine } from "../parts";
import { nativeSlots } from "../slot-props";
import type { PartSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { inFlowInline, useComponentSlots } from "../styles";
import { TimeButton, timeLocale, useTime } from "../time";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TimeInputHosts {
    readonly root: "View";
    readonly headline: "Text";
    readonly body: "View";
    readonly separator: "Text";
    readonly periodSelector: "View";
    readonly actions: "View";
    readonly input: "TextInput";
    readonly fieldLabel: "Text";
    readonly hourField: "View";
    readonly minuteField: "View";
    readonly period: "Pressable";
}

export interface TimeInputProps
    extends
        TimeBehaviorProps,
        TimeContentProps<ReactNode>,
        NativeSlotProps<TimeInputHosts> {
    readonly tokens?: TimeInputRootOwnProps["tokens"];
    readonly testId?: TestIdOverride<TimeInputPart> | undefined;
}

function TimeInputImpl(props: TimeInputProps): ReactNode {
    const [time, setTime] = useTime(props);
    const { cycle, periods } = timeLocale(props);
    const selection = timeInputSelection(props);
    const { styles: s, views: v } = useComponentSlots<TimeInputPart>(
        "timeInput",
        selection,
    );
    const id = (part: TimeInputPart) =>
        testIdOf(timeInputAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const names = {
        hour: props.translations?.hour ?? "Hour",
        minute: props.translations?.minute ?? "Minute",
        period: props.translations?.period ?? "Period",
    };
    const field = (of: TimePickerView) => (
        <Field
            of={of}
            time={time}
            cycle={cycle}
            label={names[of]}
            selection={selection}
            editable={!props.disabled && !props.readOnly}
            onTime={setTime}
            id={id}
            slot={slot}
        />
    );
    return (
        <v.root.View
            {...slot.props("root")}
            role="group"
            aria-label={
                typeof props.headline === "string"
                    ? props.headline
                    : TIME_INPUT_HEADLINE
            }
            style={slot.style("root", inFlowInline(s.root ?? {}))}
            testID={id("root")}
        >
            <v.headline.Text
                {...slot.props("headline")}
                style={slot.style("headline", s.headline)}
                testID={id("headline")}
            >
                {isPresent(props.headline)
                    ? props.headline
                    : TIME_INPUT_HEADLINE}
            </v.headline.Text>
            <v.body.View
                {...slot.props("body")}
                style={slot.style("body", s.body)}
                testID={id("body")}
            >
                {field("hour")}
                <v.separator.Text
                    {...slot.props("separator")}
                    aria-hidden
                    style={slot.style("separator", s.separator)}
                    testID={id("separator")}
                >
                    :
                </v.separator.Text>
                {field("minute")}
                {cycle === 12 ? (
                    <v.periodSelector.View
                        {...slot.props("periodSelector")}
                        role="group"
                        aria-label={names.period}
                        style={slot.style("periodSelector", s.periodSelector)}
                        testID={id("periodSelector")}
                    >
                        {(["am", "pm"] as const).map((period) => (
                            <Fragment key={period}>
                                <TimeButton
                                    slot={slot}
                                    anatomy={timeInputAnatomy}
                                    component="timeInput"
                                    part="period"
                                    selection={selection}
                                    indication={props.indication}
                                    testId={props.testId}
                                    selected={periodOf(time.hour) === period}
                                    disabled={props.disabled}
                                    onPress={() =>
                                        setTime(withPeriod(time, period))
                                    }
                                >
                                    {periods[period]}
                                </TimeButton>
                            </Fragment>
                        ))}
                    </v.periodSelector.View>
                ) : null}
            </v.body.View>
            {isPresent(props.actions) ? (
                <v.actions.View
                    {...slot.props("actions")}
                    style={slot.style("actions", s.actions)}
                    testID={id("actions")}
                >
                    {props.actions}
                </v.actions.View>
            ) : null}
        </v.root.View>
    );
}

// A field, with its own focus state: the input over its label.
function FieldImpl(props: {
    readonly of: TimePickerView;
    readonly time: Time;
    readonly cycle: HourCycle;
    readonly label: string;
    readonly selection: Record<string, unknown>;
    readonly editable: boolean;
    readonly onTime: (time: Time) => void;
    readonly id: (part: TimeInputPart) => string;
    readonly slot: PartSlots;
}): ReactNode {
    const slot = props.slot;
    const { of, time, cycle } = props;
    const [focused, setFocused] = useState(false);
    const [text, setText] = useState<string | null>(null);
    const { styles: s, views: v } = useComponentSlots<TimeInputPart>(
        "timeInput",
        props.selection,
        { focus: focused },
    );
    const part = of === "hour" ? "hourField" : "minuteField";
    const Wrapper = v[part];
    return (
        <Wrapper.View
            {...slot.props(part)}
            style={slot.style(part, s[part])}
            testID={props.id(part)}
        >
            <v.input.TextInput
                {...slot.props("input")}
                value={text ?? displayValue(time, of, cycle)}
                onChangeText={slot.on(
                    "input",
                    "onChangeText",
                    (next: string) => {
                        setText(next);
                        const value = parseField(
                            next,
                            of,
                            cycle,
                            periodOf(time.hour),
                        );
                        if (value === undefined) return;
                        props.onTime(
                            of === "hour"
                                ? { ...time, hour: value }
                                : { ...time, minute: value },
                        );
                    },
                )}
                onFocus={slot.on("input", "onFocus", () => setFocused(true))}
                onBlur={slot.on("input", "onBlur", () => {
                    setFocused(false);
                    setText(null);
                })}
                onKeyPress={slot.on(
                    "input",
                    "onKeyPress",
                    (event: TextInputKeyPressEvent) => {
                        // As the web's field: the arrows up and down and Page Up and Down step it;
                        // the sideways arrows, Home and End stay the caret's.
                        const step = timeKeyStep(event.nativeEvent.key, of);
                        if (typeof step !== "number") return;
                        const key = event.nativeEvent.key;
                        if (key === "ArrowLeft" || key === "ArrowRight") return;
                        (
                            event as { preventDefault?(): void }
                        ).preventDefault?.();
                        if (!props.editable) return;
                        setText(null);
                        props.onTime(stepTime(time, of, step, cycle));
                    },
                )}
                editable={props.editable}
                keyboardType="number-pad"
                maxLength={2}
                aria-label={props.label}
                style={slot.style("input", s.input)}
                testID={props.id("input")}
            />
            <v.fieldLabel.Text
                {...slot.props("fieldLabel")}
                aria-hidden
                selectable={false}
                style={slot.style("fieldLabel", s.fieldLabel)}
                testID={props.id("fieldLabel")}
            >
                {props.label}
            </v.fieldLabel.Text>
        </Wrapper.View>
    );
}

const Field = withEngine(FieldImpl, "TimeInputField");

/** Material's time input: `<TimeInput defaultValue="09:30" onValueChange={…} actions={…} />`. */
export const TimeInput = withEngine(TimeInputImpl, "TimeInput");

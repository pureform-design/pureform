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
    withPeriod,
} from "@pureform/machines/time-picker";
import type { HourCycle, Time } from "@pureform/machines/time-picker";
import { Fragment, type ReactNode, useState } from "react";

import { testIdOf, withEngine } from "../parts";
import { useComponentSlots } from "../styles";
import { TimeButton, timeLocale, useTime } from "../time";

export interface TimeInputProps
    extends TimeBehaviorProps, TimeContentProps<ReactNode> {
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
        />
    );
    return (
        <v.root.View
            role="group"
            aria-label={
                typeof props.headline === "string"
                    ? props.headline
                    : TIME_INPUT_HEADLINE
            }
            style={s.root}
            testID={id("root")}
        >
            <v.headline.Text style={s.headline} testID={id("headline")}>
                {isPresent(props.headline)
                    ? props.headline
                    : TIME_INPUT_HEADLINE}
            </v.headline.Text>
            <v.body.View style={s.body} testID={id("body")}>
                {field("hour")}
                <v.separator.Text
                    aria-hidden
                    style={s.separator}
                    testID={id("separator")}
                >
                    :
                </v.separator.Text>
                {field("minute")}
                {cycle === 12 ? (
                    <v.periodSelector.View
                        role="group"
                        aria-label={names.period}
                        style={s.periodSelector}
                        testID={id("periodSelector")}
                    >
                        {(["am", "pm"] as const).map((period) => (
                            <Fragment key={period}>
                                <TimeButton
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
                <v.actions.View style={s.actions} testID={id("actions")}>
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
}): ReactNode {
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
        <Wrapper.View style={s[part]} testID={props.id(part)}>
            <v.input.TextInput
                value={text ?? displayValue(time, of, cycle)}
                onChangeText={(next: string) => {
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
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false);
                    setText(null);
                }}
                editable={props.editable}
                keyboardType="number-pad"
                maxLength={2}
                aria-label={props.label}
                style={s.input}
                testID={props.id("input")}
            />
            <v.fieldLabel.Text
                aria-hidden
                selectable={false}
                style={s.fieldLabel}
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

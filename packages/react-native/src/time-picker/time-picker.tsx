// The time picker on React Native: the headline, the hour and minute selectors and the period
// selector, a clock dial (`mode="dial"`) or two adjustable scroll fields (`mode="scroll"`), and
// the actions. There's no Zag machine here: the time is held in state and changed through
// `@pureform/machines/time-picker`'s arithmetic, which the web machine runs on too. The dial takes
// touches through the responder system and is `adjustable` for assistive technology; it doesn't
// mirror under right to left.

import { timePickerAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    TIME_PICKER_HEADLINE,
    timePickerSelection,
} from "@pureform/binding-core";
import type {
    TimeBehaviorProps,
    TimeContentProps,
    TimePickerPart,
    TimePickerVariantProps,
    TimePickerView,
} from "@pureform/binding-core";
import {
    dialHand,
    dialLabels,
    dialLabelSelected,
    dialTurnAt,
    displayValue,
    periodOf,
    spokenTime,
    stepTime,
    timeAtPoint,
    viewValue,
    withPeriod,
} from "@pureform/machines/time-picker";
import { Fragment, type ReactNode, useRef, useState } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";

import { testIdOf, withEngine } from "../parts";
import { inFlowInline, useComponentSlots } from "../styles";
import { TimeButton, timeLocale, useTime } from "../time";

export interface TimePickerProps
    extends
        TimeBehaviorProps,
        TimePickerVariantProps,
        TimeContentProps<ReactNode> {
    /** The controlled view: what the dial sets. */
    readonly view?: TimePickerView | undefined;
    /** @default "hour" */
    readonly defaultView?: TimePickerView | undefined;
    readonly onViewChange?:
        | ((details: { readonly view: TimePickerView }) => void)
        | undefined;
    readonly testId?: TestIdOverride<TimePickerPart> | undefined;
}

const pct = (value: number) => `${value}%`;

type AccessibilityAction = {
    readonly nativeEvent: { readonly actionName: string };
};

const ADJUST = [{ name: "increment" }, { name: "decrement" }] as const;

function TimePickerImpl(props: TimePickerProps): ReactNode {
    const [time, setTime] = useTime(props);
    const { cycle, periods } = timeLocale(props);
    const [ownView, setOwnView] = useState(props.defaultView ?? "hour");
    const view = props.view ?? ownView;
    const setView = (next: TimePickerView) => {
        if (props.view === undefined) setOwnView(next);
        props.onViewChange?.({ view: next });
    };
    const selection = timePickerSelection(props);
    const { styles: s, views: v } = useComponentSlots<TimePickerPart>(
        "timePicker",
        selection,
    );
    const id = (part: TimePickerPart) =>
        testIdOf(timePickerAnatomy, part, props.testId);
    const scroll = props.mode === "scroll";
    const names = {
        hour: props.translations?.hour ?? "Hour",
        minute: props.translations?.minute ?? "Minute",
        period: props.translations?.period ?? "Period",
    };
    const spoken = spokenTime(time, cycle, props.locale);
    const adjust = (of: TimePickerView) => ({
        accessibilityActions: ADJUST,
        onAccessibilityAction: (event: AccessibilityAction) => {
            const by = event.nativeEvent.actionName === "increment" ? 1 : -1;
            setTime(stepTime(time, of, by, cycle));
        },
        "aria-valuenow": viewValue(time, of, cycle),
        "aria-valuetext": spoken,
    });

    const button = (
        part: TimePickerPart,
        label: string | undefined,
        selected: boolean,
        onPress: () => void,
        text: string,
    ) => (
        <TimeButton
            anatomy={timePickerAnatomy}
            component="timePicker"
            part={part}
            selection={selection}
            indication={props.indication}
            testId={props.testId}
            label={label}
            selected={selected}
            disabled={props.disabled}
            onPress={onPress}
        >
            {text}
        </TimeButton>
    );

    const scrollField = (of: TimePickerView) => {
        const part = of === "hour" ? "hourSelector" : "minuteSelector";
        const Field = v[part];
        return (
            <Field.View
                role="adjustable"
                aria-label={names[of]}
                {...adjust(of)}
                style={s[part]}
                testID={id(part)}
            >
                {([-1, 0, 1] as const).map((offset) => {
                    const at = stepTime(time, of, offset, cycle);
                    return (
                        <v.scrollItem.Text
                            key={offset}
                            aria-hidden
                            aria-selected={offset === 0}
                            onPress={() => setTime(at)}
                            style={s.scrollItem}
                            testID={id("scrollItem")}
                        >
                            {displayValue(at, of, cycle)}
                        </v.scrollItem.Text>
                    );
                })}
            </Field.View>
        );
    };

    const selector = (of: TimePickerView) =>
        scroll
            ? scrollField(of)
            : button(
                  of === "hour" ? "hourSelector" : "minuteSelector",
                  `${names[of]} ${displayValue(time, of, cycle)}`,
                  view === of,
                  () => setView(of),
                  displayValue(time, of, cycle),
              );

    return (
        <v.root.View
            role="group"
            aria-label={
                typeof props.headline === "string"
                    ? props.headline
                    : TIME_PICKER_HEADLINE
            }
            style={inFlowInline(s.root ?? {})}
            testID={id("root")}
        >
            <v.headline.Text style={s.headline} testID={id("headline")}>
                {isPresent(props.headline)
                    ? props.headline
                    : TIME_PICKER_HEADLINE}
            </v.headline.Text>
            <v.body.View style={s.body} testID={id("body")}>
                {selector("hour")}
                <v.separator.Text
                    aria-hidden
                    style={s.separator}
                    testID={id("separator")}
                >
                    :
                </v.separator.Text>
                {selector("minute")}
                {cycle === 12 ? (
                    <v.periodSelector.View
                        role="group"
                        aria-label={names.period}
                        style={s.periodSelector}
                        testID={id("periodSelector")}
                    >
                        {(["am", "pm"] as const).map((period) => (
                            <Fragment key={period}>
                                {button(
                                    "period",
                                    undefined,
                                    periodOf(time.hour) === period,
                                    () => setTime(withPeriod(time, period)),
                                    periods[period],
                                )}
                            </Fragment>
                        ))}
                    </v.periodSelector.View>
                ) : null}
            </v.body.View>
            {scroll ? null : (
                <Dial
                    styles={s}
                    views={v}
                    id={id}
                    time={time}
                    view={view}
                    cycle={cycle}
                    label={names[view]}
                    selection={selection}
                    adjust={adjust(view)}
                    onTime={setTime}
                    onRelease={() => {
                        if (view === "hour") setView("minute");
                    }}
                />
            )}
            {isPresent(props.actions) ? (
                <v.actions.View style={s.actions} testID={id("actions")}>
                    {props.actions}
                </v.actions.View>
            ) : null}
        </v.root.View>
    );
}

type Slots = ReturnType<typeof useComponentSlots<TimePickerPart>>;

// The dial: its labels, handle, track and centre placed in percent of its box, the same in both
// directions; a touch picks the value under it, and letting go of an hour moves to the minutes.
function Dial(props: {
    readonly styles: Slots["styles"];
    readonly views: Slots["views"];
    readonly id: (part: TimePickerPart) => string;
    readonly time: ReturnType<typeof useTime>[0];
    readonly view: TimePickerView;
    readonly cycle: 12 | 24;
    readonly label: string;
    readonly selection: Record<string, unknown>;
    readonly adjust: object;
    readonly onTime: (time: ReturnType<typeof useTime>[0]) => void;
    readonly onRelease: () => void;
}): ReactNode {
    const { styles: s, views: v, id, time, view, cycle } = props;
    const size = useRef({ width: 0, height: 0 });
    // The turn of a moving touch, which the hand follows exactly, as Compose's dial does; a
    // touch's start and end put it on the value.
    const [dragTurn, setDragTurn] = useState<number | undefined>(undefined);
    const at = (event: GestureResponderEvent, moving: boolean) => {
        const { width, height } = size.current;
        if (width === 0 || height === 0) return;
        const x = (event.nativeEvent.locationX / width) * 100;
        const y = (event.nativeEvent.locationY / height) * 100;
        setDragTurn(moving ? dialTurnAt(x, y) : undefined);
        props.onTime(timeAtPoint(time, view, cycle, x, y));
    };
    const hand = dialHand(time, view, cycle, dragTurn);
    const angle = hand.turn * 2 * Math.PI;
    return (
        <v.dial.View
            role="adjustable"
            aria-label={props.label}
            {...props.adjust}
            onLayout={(event: LayoutChangeEvent) => {
                size.current = event.nativeEvent.layout;
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event: GestureResponderEvent) =>
                at(event, false)
            }
            onResponderMove={(event: GestureResponderEvent) => at(event, true)}
            onResponderRelease={() => {
                setDragTurn(undefined);
                props.onRelease();
            }}
            onResponderTerminate={() => setDragTurn(undefined)}
            style={s.dial}
            testID={id("dial")}
        >
            <v.dialTrack.View
                pointerEvents="none"
                style={{
                    ...s.dialTrack,
                    left: "50%",
                    bottom: "50%",
                    height: pct(hand.radius),
                    transformOrigin: "bottom",
                    transform: [{ rotate: `${hand.turn * 360}deg` }],
                }}
                testID={id("dialTrack")}
            />
            <v.dialHandle.View
                pointerEvents="none"
                style={{
                    ...s.dialHandle,
                    left: pct(50 + hand.radius * Math.sin(angle)),
                    top: pct(50 - hand.radius * Math.cos(angle)),
                }}
                testID={id("dialHandle")}
            />
            <v.dialCenter.View
                pointerEvents="none"
                style={{ ...s.dialCenter, left: "50%", top: "50%" }}
                testID={id("dialCenter")}
            />
            {dialLabels(view, cycle).map((label) => (
                <DialLabel
                    key={label.text}
                    text={label.text}
                    x={label.x}
                    y={label.y}
                    selected={dialLabelSelected(label, time, view, cycle)}
                    selection={props.selection}
                    testId={id("dialLabel")}
                />
            ))}
        </v.dial.View>
    );
}

// A label: its own selection, so the selected one takes the handle's content color.
function DialLabelImpl(props: {
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly selected: boolean;
    readonly selection: Record<string, unknown>;
    readonly testId: string;
}): ReactNode {
    const { styles: s, views: v } = useComponentSlots<TimePickerPart>(
        "timePicker",
        props.selection,
        { selected: props.selected },
    );
    return (
        <v.dialLabel.Text
            aria-hidden
            pointerEvents="none"
            selectable={false}
            style={{ ...s.dialLabel, left: pct(props.x), top: pct(props.y) }}
            testID={props.testId}
        >
            {props.text}
        </v.dialLabel.Text>
    );
}

const DialLabel = withEngine(DialLabelImpl, "TimePickerDialLabel");

/** Material's time picker: `<TimePicker defaultValue="09:30" onValueChange={…} actions={…} />`,
 *  with `mode="scroll"` for M3 Expressive's scroll fields. Put it in a `Dialog` for the modal
 *  picker. */
export const TimePicker = withEngine(TimePickerImpl, "TimePicker");

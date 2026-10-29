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
    TimePickerInstances,
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
    nearestTurn,
    periodOf,
    spokenTime,
    stepTime,
    timeAtEdge,
    timeAtPoint,
    timeKeyStep,
    viewValue,
    withPeriod,
} from "@pureform/machines/time-picker";
import { settle } from "@pureform/rn-adapter/animated";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import {
    Fragment,
    type ReactNode,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { Animated } from "react-native";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";

import { testIdOf, withEngine } from "../parts";
import { themeSpring } from "../presence";
import { useDirection, usePureform } from "../provider";
import { useNativeSlotReader } from "../slot-props";
import type { PartSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { inFlowInline, useComponentSlots } from "../styles";
import { TimeButton, timeLocale, useTime } from "../time";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TimePickerHosts {
    readonly scrollItem: "Text";
    readonly root: "View";
    readonly headline: "Text";
    readonly body: "View";
    readonly separator: "Text";
    readonly periodSelector: "View";
    readonly actions: "View";
    readonly dial: "View";
    readonly dialTrack: "View";
    readonly dialHandle: "View";
    readonly dialCenter: "View";
    readonly dialLabel: "Text";
    readonly hourSelector: "Pressable";
    readonly minuteSelector: "Pressable";
    readonly period: "Pressable";
}

/** The time picker's props: the time's, its content, and `style` and `slotProps` keyed by part
 *  (a dial label or scroll item also by copy, `TimePickerInstances`). */
export interface TimePickerProps
    extends
        TimeBehaviorProps,
        TimePickerVariantProps,
        TimeContentProps<ReactNode>,
        NativeSlotProps<TimePickerHosts, TimePickerInstances> {
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
    const nativeSlots = useNativeSlotReader("timePicker");
    const [time, setTime] = useTime(props);
    const rtl = useDirection() === "rtl";
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
    const slot = nativeSlots(props);
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

    // The web's keys on a selector: the arrows a step (the left arrow forward right to left),
    // Page Up and Down three hours or five minutes, Home and End to the ends.
    const stepByKey = (of: TimePickerView, key: string): boolean => {
        const swapped =
            rtl && key === "ArrowLeft"
                ? "ArrowRight"
                : rtl && key === "ArrowRight"
                  ? "ArrowLeft"
                  : key;
        const step = timeKeyStep(swapped, of);
        if (step === undefined) return false;
        if (props.disabled || props.readOnly) return true;
        setTime(
            typeof step === "number"
                ? stepTime(time, of, step, cycle)
                : timeAtEdge(time, of, step, cycle),
        );
        return true;
    };
    const button = (
        part: TimePickerPart,
        label: string | undefined,
        selected: boolean,
        onPress: () => void,
        text: string,
        onKey?: (key: string) => boolean,
    ) => (
        <TimeButton
            slot={slot}
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
            onKey={onKey}
        >
            {text}
        </TimeButton>
    );

    const eachItem = slot.each("scrollItem");
    const scrollField = (of: TimePickerView) => {
        const part = of === "hour" ? "hourSelector" : "minuteSelector";
        const Field = v[part];
        return (
            <Field.View
                {...slot.props(part)}
                role="adjustable"
                aria-label={names[of]}
                {...adjust(of)}
                style={slot.style(part, s[part])}
                testID={id(part)}
            >
                {([-1, 0, 1] as const).map((offset) => {
                    const at = stepTime(time, of, offset, cycle);
                    const each = eachItem
                        ? {
                              view: of,
                              value: viewValue(at, of, cycle),
                              selected: offset === 0,
                          }
                        : undefined;
                    return (
                        <v.scrollItem.Text
                            {...slot.props("scrollItem", each)}
                            key={offset}
                            aria-hidden
                            aria-selected={offset === 0}
                            onPress={slot.on(
                                "scrollItem",
                                "onPress",
                                () => setTime(at),
                                each,
                            )}
                            style={slot.style("scrollItem", s.scrollItem, each)}
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
                  (key) => stepByKey(of, key),
              );

    return (
        <v.root.View
            {...slot.props("root")}
            role="group"
            aria-label={
                typeof props.headline === "string"
                    ? props.headline
                    : TIME_PICKER_HEADLINE
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
                    : TIME_PICKER_HEADLINE}
            </v.headline.Text>
            <v.body.View
                {...slot.props("body")}
                style={slot.style("body", s.body)}
                testID={id("body")}
            >
                {selector("hour")}
                <v.separator.Text
                    {...slot.props("separator")}
                    aria-hidden
                    style={slot.style("separator", s.separator)}
                    testID={id("separator")}
                >
                    :
                </v.separator.Text>
                {selector("minute")}
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
                    slot={slot}
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

type Slots = ReturnType<typeof useComponentSlots<TimePickerPart>>;

// The dial: its labels, handle, track and centre placed in percent of its box, the same in both
// directions; a touch picks the value under it, and letting go of an hour moves to the minutes.
function Dial(props: {
    readonly styles: Slots["styles"];
    readonly views: Slots["views"];
    readonly id: (part: TimePickerPart) => string;
    readonly slot: PartSlots;
    readonly time: ReturnType<typeof useTime>[0];
    readonly view: TimePickerView;
    readonly cycle: 12 | 24;
    readonly label: string;
    readonly selection: Record<string, unknown>;
    readonly adjust: object;
    readonly onTime: (time: ReturnType<typeof useTime>[0]) => void;
    readonly onRelease: () => void;
}): ReactNode {
    const { slot } = props;
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
    // The hand's turn, unwrapped: a dragging touch sets it at once; otherwise it springs to the
    // value the short way round (on a tap, a release, a key), as the web's track does.
    // In degrees, so the settle's rest (half a unit) is fine enough.
    const [degrees] = useState(() => new Animated.Value(hand.turn * 360));
    const shown = useRef(hand.turn);
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    const spring = reducedMotion
        ? undefined
        : themeSpring("spatialDefault", tokens, timeScale);
    useLayoutEffect(() => {
        const to = nearestTurn(hand.turn, shown.current);
        if (to === shown.current) return undefined;
        shown.current = to;
        if (dragTurn !== undefined) {
            degrees.stopAnimation();
            degrees.setValue(to * 360);
            return undefined;
        }
        return settle(degrees, 0, spring, to * 360);
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs as the hand turns or a drag starts or ends; the rest is read as it runs
    }, [hand.turn, dragTurn !== undefined]);
    const rotate = degrees.interpolate({
        inputRange: [0, 360],
        outputRange: ["0deg", "360deg"],
    });
    // The handle sits at the hand's tip: centred on the dial, moved out along the turned hand.
    // Until the dial's first layout (a frame after it mounts), its styled width (the theme's dial
    // size) places it: drawn at the centre, it would leave the selected label's light content
    // over the bare dial.
    const dialStyle = slot.style("dial", s.dial);
    const [measured, setWidth] = useState(0);
    const styled = (dialStyle as { width?: unknown } | undefined)?.width;
    const width = measured || (typeof styled === "number" ? styled : 0);
    const reach = (hand.radius / 100) * width;
    return (
        <v.dial.View
            {...slot.props("dial")}
            role="adjustable"
            aria-label={props.label}
            {...slot.with("dial", props.adjust)}
            onLayout={(event: LayoutChangeEvent) => {
                size.current = event.nativeEvent.layout;
                setWidth(event.nativeEvent.layout.width);
            }}
            onStartShouldSetResponder={slot.on(
                "dial",
                "onStartShouldSetResponder",
                () => true,
            )}
            onMoveShouldSetResponder={slot.on(
                "dial",
                "onMoveShouldSetResponder",
                () => true,
            )}
            onResponderGrant={slot.on(
                "dial",
                "onResponderGrant",
                (event: GestureResponderEvent) => at(event, false),
            )}
            onResponderMove={slot.on(
                "dial",
                "onResponderMove",
                (event: GestureResponderEvent) => at(event, true),
            )}
            onResponderRelease={slot.on("dial", "onResponderRelease", () => {
                setDragTurn(undefined);
                props.onRelease();
            })}
            onResponderTerminate={slot.on("dial", "onResponderTerminate", () =>
                setDragTurn(undefined),
            )}
            style={dialStyle}
            testID={id("dial")}
        >
            <Animated.View
                {...slot.props("dialTrack")}
                pointerEvents="none"
                style={slot.style("dialTrack", {
                    ...s.dialTrack,
                    left: "50%",
                    bottom: "50%",
                    height: pct(hand.radius),
                    transformOrigin: "bottom",
                    transform: [{ rotate }],
                })}
                testID={id("dialTrack")}
            />
            <Animated.View
                {...slot.props("dialHandle")}
                pointerEvents="none"
                style={slot.style("dialHandle", {
                    ...s.dialHandle,
                    left: "50%",
                    top: "50%",
                    transform: [
                        ...handleCentring(s.dialHandle),
                        { rotate },
                        { translateY: -reach },
                    ],
                })}
                testID={id("dialHandle")}
            />
            <v.dialCenter.View
                {...slot.props("dialCenter")}
                pointerEvents="none"
                style={slot.style("dialCenter", {
                    ...s.dialCenter,
                    left: "50%",
                    top: "50%",
                })}
                testID={id("dialCenter")}
            />
            {dialLabels(view, cycle).map((label) => (
                <DialLabel
                    key={label.text}
                    value={label.value}
                    text={label.text}
                    x={label.x}
                    y={label.y}
                    selected={dialLabelSelected(label, time, view, cycle)}
                    selection={props.selection}
                    testId={id("dialLabel")}
                    slot={slot}
                />
            ))}
        </v.dial.View>
    );
}

// The handle's own centring (the preset's translate by half its size), kept under the turn.
const handleCentring = (style: unknown): object[] => {
    const transform = (style as { transform?: unknown } | undefined)?.transform;
    return Array.isArray(transform) ? (transform as object[]) : [];
};

// A label: its own selection, so the selected one takes the handle's content color.
function DialLabelImpl(props: {
    readonly value: number;
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly selected: boolean;
    readonly selection: Record<string, unknown>;
    readonly testId: string;
    readonly slot: PartSlots;
}): ReactNode {
    const { slot } = props;
    const { styles: s, views: v } = useComponentSlots<TimePickerPart>(
        "timePicker",
        props.selection,
        { selected: props.selected },
    );
    const each = slot.each("dialLabel")
        ? { value: props.value, selected: props.selected }
        : undefined;
    return (
        <v.dialLabel.Text
            {...slot.props("dialLabel", each)}
            aria-hidden
            pointerEvents="none"
            selectable={false}
            style={slot.style(
                "dialLabel",
                {
                    ...s.dialLabel,
                    left: pct(props.x),
                    top: pct(props.y),
                },
                each,
            )}
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

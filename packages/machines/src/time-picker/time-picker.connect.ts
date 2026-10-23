import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import * as dom from "./time-picker.dom";
import {
    dialHand,
    dialLabels,
    dialLabelSelected,
    displayValue,
    formatTime,
    parseTime,
    periodOf,
    spokenTime,
    stepTime,
    timeAtEdge,
    viewRange,
    viewValue,
} from "./time-picker.time";
import type { Period, Time, TimeView } from "./time-picker.time";
import type {
    DialLabelState,
    ScrollItemState,
    TimePickerApi,
    TimePickerSchema,
} from "./time-picker.types";

interface KeyEventLike {
    key: string;
    preventDefault(): void;
}

/** How far a key moves the view's value: arrows one step, Page Up and Down five minutes or three
 *  hours, Home and End to the ends. `undefined` for any other key. */
const keyStep = (
    key: string,
    view: TimeView,
): number | "start" | "end" | undefined => {
    const page = view === "minute" ? 5 : 3;
    switch (key) {
        case "ArrowUp":
        case "ArrowRight":
            return 1;
        case "ArrowDown":
        case "ArrowLeft":
            return -1;
        case "PageUp":
            return page;
        case "PageDown":
            return -page;
        case "Home":
            return "start";
        case "End":
            return "end";
        default:
            return undefined;
    }
};

const pct = (value: number) => `${value}%`;

export function connect<T extends PropTypes>(
    service: Service<TimePickerSchema>,
    normalize: NormalizeProps<T>,
): TimePickerApi<T> {
    const { state, send, context, prop, computed, scope } = service;
    const time = context.get("value");
    const view = context.get("view");
    const cycle = computed("hourCycle");
    const translations = computed("translations");
    const periods = computed("periods");
    const disabled = !!prop("disabled");
    const readOnly = !!prop("readOnly");
    const interactive = computed("interactive");
    const period = periodOf(time.hour);
    const spokenValue = spokenTime(time, cycle, prop("locale"));
    const dir = prop("dir");
    const dragging = state.matches("dragging");

    const setTime = (next: Time) => send({ type: "VALUE.SET", time: next });

    // Moves `of`'s value by a key; true when the key was one.
    const onKey = (of: TimeView, event: KeyEventLike) => {
        // Right to left, the left arrow moves forward, as on a slider.
        const key =
            dir === "rtl" && event.key === "ArrowLeft"
                ? "ArrowRight"
                : dir === "rtl" && event.key === "ArrowRight"
                  ? "ArrowLeft"
                  : event.key;
        const step = keyStep(key, of);
        if (step === undefined) return false;
        event.preventDefault();
        if (!interactive) return true;
        setTime(
            typeof step === "number"
                ? stepTime(time, of, step, cycle)
                : timeAtEdge(time, of, step, cycle),
        );
        return true;
    };

    // What a spin button or slider over `of`'s value announces.
    const range = (of: TimeView) => {
        const { min, max } = viewRange(of, cycle);
        return {
            "aria-valuemin": min,
            "aria-valuemax": max,
            "aria-valuenow": viewValue(time, of, cycle),
            "aria-valuetext": spokenValue,
            "aria-disabled": disabled || undefined,
            "aria-readonly": readOnly || undefined,
        };
    };

    const labels: readonly DialLabelState[] = dialLabels(view, cycle).map(
        (label) => ({
            ...label,
            selected: dialLabelSelected(label, time, view, cycle),
        }),
    );
    // A moving pointer turns the hand itself, at once; otherwise it turns to the value the short
    // way round, over the track's transition.
    const following = dragging && context.get("dragTurn") !== null;
    const hand = dialHand(time, view, cycle, context.get("handTurn"));
    const handAngle = hand.turn * 2 * Math.PI;
    const handPoint = {
        x: 50 + hand.radius * Math.sin(handAngle),
        y: 50 - hand.radius * Math.cos(handAngle),
    };

    const scrollItems = (of: TimeView): readonly ScrollItemState[] =>
        ([-1, 0, 1] as const).map((offset) => {
            const at = stepTime(time, of, offset, cycle);
            return {
                value: viewValue(at, of, cycle),
                text: displayValue(at, of, cycle),
                offset,
            };
        });

    return {
        time,
        value: formatTime(time),
        view,
        hourCycle: cycle,
        period,
        periodNames: periods,
        translations,
        spokenValue,
        disabled,
        dialLabels: labels,
        scrollItems,
        setTime,
        setValue(value) {
            const next = parseTime(value);
            if (next) setTime(next);
        },
        setView(next) {
            send({ type: "VIEW.SET", view: next });
        },
        setPeriod(next) {
            send({ type: "PERIOD.SET", period: next });
        },
        getRootProps() {
            return normalize.element({
                id: dom.getRootId(scope),
                dir,
                role: "group",
                "aria-labelledby": dom.getHeadlineId(scope),
                "data-disabled": dataAttr(disabled),
                "data-view": view,
            });
        },
        getHeadlineProps() {
            return normalize.element({ id: dom.getHeadlineId(scope), dir });
        },
        getBodyProps() {
            return normalize.element({ dir });
        },
        getSeparatorProps() {
            return normalize.element({ dir, "aria-hidden": true });
        },
        getSelectorProps(of) {
            return normalize.button({
                dir,
                type: "button",
                disabled,
                // The name holds the shown value, so it reads as the button's text does.
                "aria-label": `${translations[of]} ${displayValue(time, of, cycle)}`,
                "aria-pressed": view === of,
                "aria-controls": dom.getDialId(scope),
                "data-view": of,
                onClick() {
                    send({ type: "VIEW.SET", view: of });
                },
                onKeyDown(event: KeyEventLike) {
                    if (onKey(of, event) && view !== of)
                        send({ type: "VIEW.SET", view: of });
                },
            });
        },
        getScrollFieldProps(of) {
            return normalize.element({
                dir,
                role: "spinbutton",
                tabIndex: disabled ? undefined : 0,
                "aria-label": translations[of],
                ...range(of),
                "data-view": of,
                onKeyDown(event: KeyEventLike) {
                    // A spin button goes up with the up arrow only.
                    if (event.key === "ArrowLeft" || event.key === "ArrowRight")
                        return;
                    onKey(of, event);
                },
                onWheel(event: { deltaY: number; preventDefault(): void }) {
                    if (!interactive || event.deltaY === 0) return;
                    event.preventDefault();
                    setTime(
                        stepTime(time, of, event.deltaY > 0 ? 1 : -1, cycle),
                    );
                },
            });
        },
        getScrollItemProps(of, item) {
            return normalize.element({
                dir,
                "aria-hidden": true,
                "aria-selected": item.offset === 0,
                "data-offset": item.offset,
                onClick() {
                    if (interactive && item.offset !== 0)
                        setTime(stepTime(time, of, item.offset, cycle));
                },
            });
        },
        getPeriodSelectorProps() {
            return normalize.element({
                id: dom.getPeriodSelectorId(scope),
                dir,
                role: "group",
                "aria-label": translations.period,
            });
        },
        getPeriodProps(of: Period) {
            return normalize.button({
                dir,
                type: "button",
                disabled,
                "aria-pressed": period === of,
                "data-period": of,
                onClick() {
                    send({ type: "PERIOD.SET", period: of });
                },
            });
        },
        getDialProps() {
            return normalize.element({
                id: dom.getDialId(scope),
                dir,
                role: "slider",
                tabIndex: disabled ? undefined : 0,
                "aria-label": translations[view],
                ...range(view),
                "data-view": view,
                "data-dragging": dataAttr(dragging),
                style: { touchAction: "none" },
                onKeyDown(event: KeyEventLike & { key: string }) {
                    if (onKey(view, event)) return;
                    if (event.key === "Enter" && view === "hour") {
                        event.preventDefault();
                        send({ type: "VIEW.SET", view: "minute" });
                    }
                },
                onPointerDown(event: {
                    button: number;
                    pointerId: number;
                    clientX: number;
                    clientY: number;
                    currentTarget: EventTarget | null;
                    preventDefault(): void;
                }) {
                    if (event.button !== 0 || !interactive) return;
                    const point = dom.pointOnDial(
                        scope,
                        event.clientX,
                        event.clientY,
                    );
                    if (!point) return;
                    event.preventDefault();
                    (event.currentTarget as HTMLElement | null)?.focus({
                        preventScroll: true,
                    });
                    send({
                        type: "DIAL.POINTER_DOWN",
                        point,
                        pointerId: event.pointerId,
                    });
                },
            });
        },
        getDialTrackProps() {
            return normalize.element({
                dir,
                "aria-hidden": true,
                style: {
                    left: "50%",
                    bottom: "50%",
                    height: pct(hand.radius),
                    transformOrigin: "bottom",
                    transform: `rotate(${hand.turn * 360}deg)`,
                    ...(following ? { transition: "none" } : {}),
                },
            });
        },
        getDialHandleProps() {
            return normalize.element({
                dir,
                "aria-hidden": true,
                style: {
                    // Where a browser without motion paths places it.
                    left: pct(handPoint.x),
                    top: pct(handPoint.y),
                    // Round the centre at the hand's length, as far along as the hand has
                    // turned (the path starts at three o'clock), so a transition of the distance
                    // moves it round with the track rather than jumping. Its corner sits on the
                    // path; the styles' own centring shifts it back by half its size.
                    offsetPath: `circle(${pct(hand.radius)} at 50% 50%)`,
                    offsetDistance: pct((hand.turn - 0.25) * 100),
                    offsetRotate: "0deg",
                    offsetAnchor: "0 0",
                    ...(following ? { transition: "none" } : {}),
                },
            });
        },
        getDialCenterProps() {
            return normalize.element({
                dir,
                "aria-hidden": true,
                style: { left: "50%", top: "50%" },
            });
        },
        getDialLabelProps(label) {
            return normalize.element({
                dir,
                "aria-hidden": true,
                "aria-selected": label.selected,
                "data-inner": dataAttr(label.inner),
                style: { left: pct(label.x), top: pct(label.y) },
            });
        },
        getActionsProps() {
            return normalize.element({ dir });
        },
        getFieldProps(of) {
            return normalize.label({
                dir,
                htmlFor: dom.getInputId(scope, of),
                "data-view": of,
            });
        },
        getInputProps(of) {
            const text = context.get(of === "hour" ? "hourText" : "minuteText");
            return normalize.input({
                id: dom.getInputId(scope, of),
                dir,
                type: "text",
                inputMode: "numeric",
                autoComplete: "off",
                maxLength: 2,
                disabled,
                readOnly,
                "aria-label": translations[of],
                value: text ?? displayValue(time, of, cycle),
                "data-view": of,
                onChange(event: { currentTarget: { value: string } }) {
                    send({
                        type: "FIELD.TYPE",
                        view: of,
                        text: event.currentTarget.value,
                    });
                },
                onBlur() {
                    send({ type: "FIELD.BLUR", view: of });
                },
                onKeyDown(event: KeyEventLike) {
                    if (event.key === "ArrowLeft" || event.key === "ArrowRight")
                        return;
                    if (event.key === "Home" || event.key === "End") return;
                    if (onKey(of, event))
                        send({ type: "FIELD.BLUR", view: of });
                },
            });
        },
        getFieldLabelProps(of) {
            return normalize.element({
                dir,
                "aria-hidden": true,
                "data-view": of,
            });
        },
        getHiddenInputProps() {
            return normalize.input({
                type: "hidden",
                name: prop("name"),
                form: prop("form"),
                disabled,
                value: formatTime(time),
            });
        },
    };
}

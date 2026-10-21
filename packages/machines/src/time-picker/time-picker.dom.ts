import type { Scope } from "@zag-js/core";

import { timeAtPoint } from "./time-picker.time";
import type { HourCycle, Time, TimeView } from "./time-picker.time";

export const getRootId = (scope: Scope): string =>
    scope.ids?.root ?? `time-picker:${scope.id}`;
export const getHeadlineId = (scope: Scope): string =>
    scope.ids?.headline ?? `time-picker:${scope.id}:headline`;
export const getDialId = (scope: Scope): string =>
    scope.ids?.dial ?? `time-picker:${scope.id}:dial`;
export const getInputId = (scope: Scope, view: TimeView): string =>
    (view === "hour" ? scope.ids?.hourInput : scope.ids?.minuteInput) ??
    `time-picker:${scope.id}:${view}-input`;
export const getPeriodSelectorId = (scope: Scope): string =>
    `time-picker:${scope.id}:period`;

export const getDialEl = (scope: Scope): HTMLElement | null =>
    scope.getById<HTMLElement>(getDialId(scope));

/** A point on the page as a point on the dial, in percent of its box from the top left. */
export const pointOnDial = (
    scope: Scope,
    clientX: number,
    clientY: number,
): { x: number; y: number } | undefined => {
    const dial = getDialEl(scope);
    if (!dial) return undefined;
    const box = dial.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return undefined;
    return {
        x: ((clientX - box.left) / box.width) * 100,
        y: ((clientY - box.top) / box.height) * 100,
    };
};

export const timeAtDialPoint = (
    time: Time,
    view: TimeView,
    cycle: HourCycle,
    point: { x: number; y: number },
): Time => timeAtPoint(time, view, cycle, point.x, point.y);

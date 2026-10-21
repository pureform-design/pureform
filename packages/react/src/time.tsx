// What the time picker and the time input share: the machine with its controllable time.

import { timeMachineProps } from "@pureform/binding-core";
import type {
    TimePickerRootOwnProps,
    TimeValueChangeDetails,
} from "@pureform/binding-core";
import * as timePicker from "@pureform/machines/time-picker";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { useId } from "react";

import { useControllable } from "./controllable";
import { useMachine } from "./machine";
import { useDirection } from "./provider";

/** The time-picker machine's API. */
export type TimeApi = timePicker.Api<PropTypes>;

/** Runs the time-picker machine for a Root, the time and the view controllable. */
export function useTimeMachine(
    component: string,
    props: TimePickerRootOwnProps,
): TimeApi {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string, TimeValueChangeDetails>(
        component,
        "value",
        props,
    );
    const service = useMachine(timePicker.machine, {
        id,
        dir,
        ...timeMachineProps(props),
        view: props.view,
        defaultView: props.defaultView,
        onViewChange: props.onViewChange,
        ...value.machineProps,
    });
    return timePicker.connect(service, normalizeProps);
}

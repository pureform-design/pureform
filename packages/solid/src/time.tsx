// What the time picker and the time input share: the machine with its controllable time.

import type {
    TimePickerRootOwnProps,
    TimeValueChangeDetails,
} from "@pureform/binding-core";
import { timeMachineProps } from "@pureform/binding-web";
import * as timePicker from "@pureform/machines/time-picker";
import { type Accessor, createMemo, createUniqueId } from "solid-js";

import { useControllable } from "./controllable";
import { normalizeProps, useMachine } from "./internal/zag";
import type { PropTypes } from "./internal/zag";
import { useDirection } from "./provider";

type Api = timePicker.Api<PropTypes>;

/** Runs the time-picker machine for a Root, the time and the view controllable. Shared with the
 *  time input. */
export function useTimeMachine(
    component: string,
    props: TimePickerRootOwnProps,
): Accessor<Api> {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string, TimeValueChangeDetails>(
        component,
        "value",
        props,
    );
    const service = useMachine(timePicker.machine, () => ({
        id,
        dir: dir(),
        ...timeMachineProps(props),
        view: props.view,
        defaultView: props.defaultView,
        onViewChange: props.onViewChange,
        ...value.machineProps(),
    }));
    return createMemo(() => timePicker.connect(service, normalizeProps));
}

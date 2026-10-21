// What the time picker and the time input share: the machine with its controllable time, and their
// parts that only spread the machine's props.

import type { ComponentAnatomy, PartName } from "@pureform/anatomy";
import { timeMachineProps } from "@pureform/binding-core";
import type {
    TimePickerRootOwnProps,
    TimeValueChangeDetails,
} from "@pureform/binding-core";
import * as timePicker from "@pureform/machines/time-picker";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ReactNode, useId } from "react";

import { useControllable } from "./controllable";
import { useMachine } from "./machine";
import type { PartScope, PlainPartProps } from "./parts";
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

/** A part from the machine's props. */
export const machinePart =
    <A extends ComponentAnatomy, C>(
        use: (name: string) => C & { readonly scope: PartScope<A> },
        element: "div" | "span" | "label",
    ) =>
    (part: PartName<A>, label: string, machine: (context: C) => object) =>
        function Part({ unstyled, ...props }: PlainPartProps): ReactNode {
            const value = use(label);
            return value.scope.render(part, {
                element,
                machine: machine(value),
                unstyled,
                props,
            });
        };

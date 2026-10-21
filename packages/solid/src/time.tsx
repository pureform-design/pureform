// What the time picker and the time input share: the machine with its controllable time, and their
// parts that only spread the machine's props.

import type { ComponentAnatomy, PartName } from "@pureform/anatomy";
import { timeMachineProps } from "@pureform/binding-core";
import type {
    TimePickerRootOwnProps,
    TimeValueChangeDetails,
} from "@pureform/binding-core";
import * as timePicker from "@pureform/machines/time-picker";
import type { JSX } from "@solidjs/web";
import { type Accessor, createMemo, createUniqueId, omit } from "solid-js";

import { useControllable } from "./controllable";
import { normalizeProps, useMachine } from "./internal/zag";
import type { PropTypes } from "./internal/zag";
import type { PartScope, PlainPartProps } from "./parts";
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

/** A part from the machine's props. */
export const machinePart =
    <A extends ComponentAnatomy, C>(
        use: (name: string) => C & { readonly scope: PartScope<A> },
        element: "div" | "span" | "label",
    ) =>
    (part: PartName<A>, label: string, machine: (context: C) => object) =>
        function Part(props: PlainPartProps): JSX.Element {
            const value = use(label);
            return value.scope.render(part, {
                element,
                machine: () => machine(value),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled"),
            });
        };

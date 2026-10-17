// What the components on the button machine share: Root's machine, with its id, the provider's
// direction, and the controllable `selected` of a toggle.

import type { ButtonBehaviorProps } from "@pureform/binding-core";
import * as button from "@pureform/machines/button";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { useId } from "react";

import { useControllable } from "./controllable";
import { useMachine } from "./machine";
import type { MachineProps } from "./machine";
import { useDirection } from "./provider";

/** Runs the button machine for a Root: `machineProps` are the contract's (`buttonMachineProps`,
 *  `fabMachineProps`), and `selected` comes from `props` through `useControllable`. `component`
 *  names it in the development warning. */
export function usePressable(
    component: string,
    props: Pick<
        ButtonBehaviorProps,
        "selected" | "defaultSelected" | "onSelectedChange"
    >,
    machineProps: MachineProps<button.Schema>,
): button.Api<PropTypes> {
    const id = useId();
    const dir = useDirection();
    const selected = useControllable<"selected", boolean>(
        component,
        "selected",
        props,
    );
    const service = useMachine(button.machine, {
        id,
        dir,
        ...machineProps,
        ...selected.machineProps,
    });
    return button.connect(service, normalizeProps);
}

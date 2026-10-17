// What the components on the button machine share: Root's machine, with its id, the provider's
// direction, and the controllable `selected` of a toggle.

import type {
    ButtonBehaviorProps,
    InteractionSourceProps,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import * as button from "@pureform/machines/button";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { useId } from "react";

import { useControllable } from "./controllable";
import { useOwnInteractionSource } from "./interaction";
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
    > &
        InteractionSourceProps,
    machineProps: MachineProps<button.Schema>,
): {
    readonly api: button.Api<PropTypes>;
    readonly source: MutableInteractionSource | undefined;
} {
    const id = useId();
    const dir = useDirection();
    const selected = useControllable<"selected", boolean>(
        component,
        "selected",
        props,
    );
    const source = useOwnInteractionSource(props.interactionSource);
    const service = useMachine(button.machine, {
        id,
        interactionSource: source,
        dir,
        ...machineProps,
        ...selected.machineProps,
    });
    return { api: button.connect(service, normalizeProps), source };
}

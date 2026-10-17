// What the components on the button machine share: Root's machine, with its id, the provider's
// direction, and the controllable `selected` of a toggle.

import type { ButtonBehaviorProps } from "@pureform/binding-core";
import * as button from "@pureform/machines/button";
import { type Accessor, createMemo, createUniqueId } from "solid-js";

import { useControllable } from "./controllable";
import { ownInteractionSource } from "./interaction";
import { normalizeProps, useMachine } from "./internal/zag";
import type { MachineProps, PropTypes } from "./internal/zag";
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
    machineProps: () => MachineProps<button.Schema>,
): Accessor<button.Api<PropTypes>> {
    const id = createUniqueId();
    const dir = useDirection();
    const selected = useControllable<"selected", boolean>(
        component,
        "selected",
        props,
    );
    const interaction = ownInteractionSource();
    const service = useMachine(button.machine, () => ({
        id,
        ...interaction,
        dir: dir(),
        ...machineProps(),
        ...selected.machineProps(),
    }));
    return createMemo(() => button.connect(service, normalizeProps));
}

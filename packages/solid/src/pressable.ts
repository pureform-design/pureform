// What the components on the button machine share: Root's machine, with its id, the provider's
// direction, the controllable `selected` of a toggle, and its interaction source.

import type {
    ButtonBehaviorProps,
    InteractionSourceProps,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import * as button from "@pureform/machines/button";
import { type Accessor, createMemo, createUniqueId } from "solid-js";

import { useControllable } from "./controllable";
import { useOwnInteractionSource } from "./interaction";
import { normalizeProps, useMachine } from "./internal/zag";
import type { MachineProps, PropTypes } from "./internal/zag";
import { useDirection } from "./provider";

/** Runs the button machine for a Root: `machineProps` are the contract's (`buttonMachineProps`,
 *  `fabMachineProps`), and `selected` comes from `props` through `useControllable`. `component`
 *  names it in the development warning. Pass the source on to `useComponent`. */
export function usePressable(
    component: string,
    props: Pick<
        ButtonBehaviorProps,
        "selected" | "defaultSelected" | "onSelectedChange"
    > &
        InteractionSourceProps,
    machineProps: () => MachineProps<button.Schema>,
): {
    readonly api: Accessor<button.Api<PropTypes>>;
    readonly source: Accessor<MutableInteractionSource | undefined>;
} {
    const id = createUniqueId();
    const dir = useDirection();
    const selected = useControllable<"selected", boolean>(
        component,
        "selected",
        props,
    );
    const source = useOwnInteractionSource(() => props.interactionSource);
    const service = useMachine(button.machine, () => ({
        id,
        interactionSource: source(),
        dir: dir(),
        ...machineProps(),
        ...selected.machineProps(),
    }));
    const api = createMemo(() => button.connect(service, normalizeProps));
    return { api, source };
}

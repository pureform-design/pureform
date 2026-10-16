// Zag's `useMachine`, typed for components: each machine prop may be `undefined`, since a
// component passes its own optional props through. Zag drops the `undefined` ones.

import type { Machine, MachineSchema, Service } from "@zag-js/core";
import { useMachine as useZagMachine } from "@zag-js/react";

/** A machine's props, each optional and allowed to be `undefined`. */
export type MachineProps<T extends MachineSchema> = {
    [K in keyof T["props"]]?: T["props"][K] | undefined;
};

/** Runs `machine` with `props`, as `@zag-js/react`'s `useMachine`. */
export const useMachine = <T extends MachineSchema>(
    machine: Machine<T>,
    props: MachineProps<T>,
): Service<T> => useZagMachine(machine, props as Partial<T["props"]>);

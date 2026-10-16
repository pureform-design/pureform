// Test harness: runs a machine with Zag's vanilla adapter and spreads its parts' props on real
// elements after every change, as a binding would.

import type { Machine, MachineSchema, Service } from "@zag-js/core";
import type { NormalizeProps, PropTypes } from "@zag-js/types";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";

type Connect<T extends MachineSchema> = (
    service: Service<T>,
    normalize: NormalizeProps<PropTypes>,
) => unknown;

/** A machine's props, each allowed to be `undefined`, as a binding passes them. */
export type MachineProps<T extends MachineSchema> = {
    [K in keyof T["props"]]?: T["props"][K] | undefined;
};

export interface Running<T extends MachineSchema, Api> {
    readonly runner: VanillaMachine<T>;
    readonly service: Service<T>;
    /** The API from the latest render. */
    api(): Api;
    /** Replace the props (unlike `updateProps`, an `undefined` clears a prop). */
    setProps(next: MachineProps<T>): void;
    stop(): void;
}

export function run<
    T extends MachineSchema,
    C extends Connect<T>,
    Api = ReturnType<C>,
>(
    machine: Machine<T>,
    connect: C,
    initialProps: MachineProps<T>,
    bind: (api: Api, spread: (el: Element, props: object) => void) => void,
): Running<T, Api> {
    let props = initialProps;
    const runner = new VanillaMachine(machine, () => props as never);
    let api!: Api;
    const spread = (el: Element, attrs: object) =>
        spreadProps(
            el,
            attrs as never,
            String((props as { id?: string }).id ?? ""),
        );
    const render = () => {
        api = connect(runner.service, normalizeProps as never) as Api;
        bind(api, spread);
    };
    render();
    runner.subscribe(render);
    runner.start();
    render();
    return {
        runner,
        get service() {
            return runner.service;
        },
        api: () => api,
        setProps(next) {
            props = next;
            runner.updateProps({});
        },
        stop() {
            runner.stop();
        },
    };
}

/** Wait for queued machine events, which Zag sends in a microtask, and a task after them. */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

// Controlled and uncontrolled state mapped onto a Zag machine's props. Zag names them the same way
// (`checked`, `defaultChecked`, `onCheckedChange`); this reads the default once, warns in
// development when the value prop switches between defined and `undefined`, and adds
// `reason: "reset"` to the callbacks a form reset causes.

import {
    controllableNames,
    createChangeReason,
    createControlTracker,
} from "@pureform/binding-core";
import type {
    ChangeReason,
    Controllable,
    ControllableMachineProps,
} from "@pureform/binding-core";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { isDev } from "./env";

export type { ControllableMachineProps } from "@pureform/binding-core";

/** One controllable value of a component, for this render. */
export interface ControllableState<N extends string, T, D extends object> {
    /** The value prop as given; `undefined` when uncontrolled. */
    readonly value: T | undefined;
    /** The `default*` prop, read once at creation. */
    readonly defaultValue: T | undefined;
    /** Whether the value prop is defined. */
    readonly controlled: boolean;
    /** What a form reset should show: the controlled value, else the default. */
    readonly resetsTo: T | undefined;
    /** The machine's props, to spread into `useMachine`'s: the value, the default read once, and
     *  a stable callback that calls the latest `on*Change`, with `reason` added during a reset. */
    readonly machineProps: ControllableMachineProps<N, T, D>;
    /** For the form's `reset` event (`useFormReset`'s `onBeforeReset`): until the next task,
     *  callbacks the machine's own reset causes report `reason: "reset"` when uncontrolled, and
     *  are dropped when controlled, since Zag resets to the value at creation. Stable. */
    readonly beforeReset: () => void;
    /** Runs `update` (sending the machine the default, in `useFormReset`'s `onReset`) so the
     *  callbacks it causes report `reason: "reset"`. Stable. */
    readonly reset: (update: () => void) => void;
}

/** Maps a component's controllable props onto its machine. `component` names it in the
 *  development warning: `useControllable("Checkbox", "checked", props)`. */
export function useControllable<
    N extends string,
    T,
    D extends object = { readonly [K in N]: T },
>(
    component: string,
    name: N,
    props: Controllable<N, T, D & { readonly reason?: ChangeReason }>,
): ControllableState<N, T, D> {
    const names = controllableNames(name);
    const source = props as unknown as Record<string, unknown>;
    const value = source[names.value] as T | undefined;
    const [defaultValue] = useState(
        () => source[names.defaultValue] as T | undefined,
    );
    const controlled = value !== undefined;
    const [reason] = useState(createChangeReason);

    const latest = useRef({
        onChange: source[names.onChange] as ((details: D) => void) | undefined,
        controlled,
    });
    useLayoutEffect(() => {
        latest.current = {
            onChange: source[names.onChange] as
                | ((details: D) => void)
                | undefined,
            controlled,
        };
    });

    const [track] = useState(() =>
        isDev
            ? createControlTracker(component, name, controlled, (message) =>
                  console.warn(message),
              )
            : undefined,
    );
    useEffect(() => track?.(controlled), [track, controlled]);

    const onChange = useCallback(
        (details: D) => reason.report(latest.current.onChange, details),
        [reason],
    );
    const beforeReset = useCallback(
        () => reason.untilNextTask({ drop: latest.current.controlled }),
        [reason],
    );
    const reset = useCallback(
        (update: () => void) => reason.during(update),
        [reason],
    );

    return {
        value,
        defaultValue,
        controlled,
        resetsTo: controlled ? value : defaultValue,
        machineProps: {
            [names.value]: value,
            [names.defaultValue]: defaultValue,
            [names.onChange]: onChange,
        } as ControllableMachineProps<N, T, D>,
        beforeReset,
        reset,
    };
}

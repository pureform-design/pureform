// Runs a Zag machine as a Solid 2 service. Ported from @zag-js/solid 1.46.0 (MIT): the
// machine starts in `onSettled` (Solid 1's `onMount`), and state and events are plain
// objects rather than `mergeProps` results, since nothing in them is reactive.

import type {
    ActionsOrFn,
    BindableContext,
    ChooseFn,
    ComputedFn,
    EffectsOrFn,
    GuardFn,
    Machine,
    MachineSchema,
    Params,
    Service,
} from "@zag-js/core";
import {
    INIT_STATE,
    MachineStatus,
    createReplaceTracker,
    createScope,
    findTransition,
    getExitEnterStates,
    hasTag,
    matchesState,
    resolveStateValue,
} from "@zag-js/core";
import {
    callAll,
    compact,
    ensure,
    isFunction,
    isString,
    toArray,
    warn,
} from "@zag-js/utils";
import {
    type Accessor,
    createMemo,
    onCleanup,
    onSettled,
    untrack,
} from "solid-js";

import { createBindable, readingLatest, readNow } from "./bindable";
import { createRefs } from "./refs";
import { createTracker } from "./track";

/** A machine's props, each optional and allowed to be `undefined`, since a component passes
 *  its own optional props through. */
export type MachineProps<T extends MachineSchema> = {
    [K in keyof T["props"]]?: T["props"][K] | undefined;
};

export function useMachine<T extends MachineSchema>(
    machine: Machine<T>,
    userProps: MachineProps<T> | Accessor<MachineProps<T>> = {},
): Service<T> {
    const scope = createMemo(() => {
        const { id, ids, getRootNode } = access(userProps) as any;
        return createScope({ id, ids, getRootNode });
    });

    const debug = (...args: unknown[]) => {
        if (machine.debug) console.log(...args);
    };

    const props = createMemo(
        () =>
            machine.props?.({
                props: compact(access(userProps)),
                scope: readNow(scope),
            }) ?? access(userProps),
    );
    const prop: any = createProp(props);

    let status = MachineStatus.NotStarted;
    const tracker = createTracker(() => status === MachineStatus.Stopped);

    // A machine reads its props once while it sets up its context (Zag's select finds the items
    // of its initial value), which isn't a dependency.
    const context: any = untrack(() =>
        machine.context?.({
            prop,
            bindable: createBindable as any,
            get scope() {
                return readNow(scope);
            },
            flush,
            getContext() {
                return ctx as any;
            },
            getComputed() {
                return computed as any;
            },
            getRefs() {
                return refs as any;
            },
            getEvent() {
                return getEvent();
            },
        }),
    );

    const ctx: BindableContext<T> = {
        get(key) {
            return context?.[key].get();
        },
        set(key, value) {
            tracker.run(() => context?.[key].set(value));
        },
        initial(key) {
            return context?.[key].initial;
        },
        hash(key) {
            const current = context?.[key].get();
            return context?.[key].hash(current);
        },
    };

    let effects = new Map<string, VoidFunction>();
    let transition: any = null;
    let previousEvent: any = null;
    let event: any = { type: "" };

    const getEvent = (): any => ({
        ...event,
        current: () => event,
        previous: () => previousEvent,
    });

    // The bindable's properties by descriptor, so its `ref` getter stays live.
    const getState = () =>
        Object.defineProperties(
            {
                matches(...values: T["state"][]) {
                    const current = state.get();
                    return values.some((value) =>
                        matchesState(current as string, value as string),
                    );
                },
                hasTag(tag: T["tag"]) {
                    return hasTag(machine, state.get(), tag);
                },
            },
            Object.getOwnPropertyDescriptors(state),
        ) as Params<T>["state"];

    // A machine's refs hold what it reads imperatively, when an event fires (pureform's interaction
    // emitters read their source then), which may be during Solid's own updates: the props they
    // read are the current ones, not dependencies.
    const untrackedProp: any = (key: string) => untrack(() => prop(key));
    const refs = createRefs(
        untrack(() => machine.refs?.({ prop: untrackedProp, context: ctx })) ??
            {},
    );

    const getParams = (): Params<T> => ({
        state: getState(),
        context: ctx,
        event: getEvent(),
        prop,
        send,
        action,
        guard,
        track: tracker.track,
        refs,
        computed,
        flush,
        get scope() {
            return readNow(scope);
        },
        choose,
    });

    const action = (keys: ActionsOrFn<T> | undefined) => {
        const names = isFunction(keys) ? keys(getParams()) : keys;
        if (!names) return;
        for (const name of names) {
            const fn = machine.implementations?.actions?.[name];
            if (!fn) {
                warn(
                    `[zag-js] No implementation found for action "${JSON.stringify(name)}"`,
                );
            }
            fn?.(getParams());
        }
    };

    const guard = (str: T["guard"] | GuardFn<T>) => {
        if (isFunction(str)) return str(getParams());
        const fn = machine.implementations?.guards?.[str];
        if (!fn) {
            warn(
                `[zag-js] No implementation found for guard "${JSON.stringify(str)}"`,
            );
        }
        return fn?.(getParams());
    };

    const effect = (keys: EffectsOrFn<T> | undefined) => {
        const names = isFunction(keys) ? keys(getParams()) : keys;
        if (!names) return;
        const cleanups: VoidFunction[] = [];
        for (const name of names) {
            const fn = machine.implementations?.effects?.[name];
            if (!fn) {
                warn(
                    `[zag-js] No implementation found for effect "${JSON.stringify(name)}"`,
                );
            }
            const cleanup = fn?.(getParams());
            if (cleanup) cleanups.push(cleanup);
        }
        return () => cleanups.forEach((fn) => fn?.());
    };

    const choose: ChooseFn<T> = (transitions) =>
        toArray(transitions).find((t) => {
            if (isString(t.guard)) return !!guard(t.guard);
            if (isFunction(t.guard)) return t.guard(getParams());
            return !t.guard;
        });

    const computed: ComputedFn<T> = (key) => {
        ensure(
            machine.computed,
            () => `[zag-js] No computed object found on machine`,
        );
        return machine.computed[key]({
            context: ctx,
            event,
            prop,
            refs,
            scope: readNow(scope),
            computed,
        });
    };

    const keep = (path: string, cleanup: VoidFunction | undefined) => {
        if (!cleanup) return;
        const existing = effects.get(path);
        effects.set(path, existing ? callAll(existing, cleanup) : cleanup);
    };

    const state = createBindable(() => ({
        defaultValue: resolveStateValue(
            machine,
            machine.initialState({ prop }),
        ),
        onChange(nextState: any, prevState: any) {
            const { exiting, entering } = getExitEnterStates(
                machine,
                prevState,
                nextState,
                transition?.reenter,
            );
            for (const item of exiting) {
                effects.get(item.path)?.();
                effects.delete(item.path);
            }
            for (const item of exiting) action(item.state?.exit);
            action(transition?.actions);
            for (const item of entering) {
                keep(item.path, effect(item.state?.effects));
            }
            if (prevState === INIT_STATE) {
                action(machine.entry);
                keep(INIT_STATE, effect(machine.effects));
            }
            for (const item of entering) action(item.state?.entry);
        },
    }));

    onSettled(() => {
        const started = status === MachineStatus.Started;
        status = MachineStatus.Started;
        debug(started ? "rehydrating..." : "initializing...");
        // The machine's entry actions and effects read its props and context for their current
        // values, which isn't a dependency of this callback.
        untrack(() =>
            tracker.run(() => state.invoke(state.initial!, INIT_STATE as any)),
        );
    });

    onCleanup(() => {
        if (status !== MachineStatus.Started) return;
        debug("unmounting...");
        status = MachineStatus.Stopped;
        effects.forEach((fn) => fn?.());
        effects = new Map();
        transition = null;
        action(machine.exit);
    });

    const replaceTracker = createReplaceTracker();

    const send = (sent: any) => {
        const key = sent.replaces;
        const token = key ? replaceTracker.claim(key) : undefined;
        queueMicrotask(() => {
            if (key && token && replaceTracker.isReplaced(key, token)) return;
            if (status !== MachineStatus.Started) return;

            tracker.run(() => transitionOn(sent));
        });
    };

    const transitionOn = (sent: any) => {
        previousEvent = event;
        event = sent;

        // The last state written, not the one Solid shows until its next flush: an event sent
        // while another's transition is unflushed (a blur, then the focus it moves to) starts
        // from the state that transition went to.
        const current = untrack(() => readingLatest(() => state.get()));
        const { transitions, source } = findTransition(
            machine,
            current,
            sent.type as string,
        );
        const chosen = choose(transitions);
        if (!chosen) return;

        transition = chosen;
        const target = resolveStateValue(
            machine,
            chosen.target ?? current,
            source,
        );
        debug(
            "transition",
            sent.type,
            chosen.target || current,
            `(${chosen.actions?.join(",")})`,
        );

        if (target !== current) state.set(target);
        else if (chosen.reenter) state.invoke(current, current);
        else action(chosen.actions);
    };

    machine.watch?.(getParams());

    return {
        state: getState(),
        send,
        context: ctx,
        prop,
        get scope() {
            return readNow(scope);
        },
        refs,
        computed,
        event: getEvent(),
        getStatus: () => status,
    } as unknown as Service<T>;
}

function flush(fn: VoidFunction) {
    fn();
}

function access<T>(value: T | Accessor<T>): T {
    return isFunction(value) ? (value as Accessor<T>)() : value;
}

function createProp<T>(value: Accessor<T>) {
    return function get<K extends keyof T>(key: K): T[K] {
        return readNow(value)[key];
    };
}

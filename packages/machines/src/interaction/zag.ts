// Zag's machines with pureform's interaction source: the props a machine takes its sources in, the
// emitters it keeps in its refs, and part props with the emitters' handlers chained after Zag's.

import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { Machine, MachineSchema, Params, Service } from "@zag-js/core";

import { InteractionEmitters } from "./emitter";

/** The props a machine with one interactive surface takes its source in. */
export interface InteractionProps {
    /** The source the machine emits its surface's interactions to. Without one, it emits
     *  nothing (the button machine keeps its own). */
    interactionSource?: MutableInteractionSource | undefined;
}

/** The props a composite machine (radios, tabs, menu items, …) takes its items' sources in. */
export interface ItemInteractionProps {
    /** The source for each item, by its value, which the machine emits the item's interactions
     *  to. Called when the item first emits. Without it, items emit nothing. */
    itemInteractionSource?:
        | ((value: string) => MutableInteractionSource)
        | undefined;
}

/** A Zag machine's schema with more props. */
export type WithProps<S extends MachineSchema, P> = Omit<S, "props"> & {
    props: S["props"] & P;
};

/** The schema of a Zag machine. */
export type SchemaOf<M> = M extends Machine<infer S> ? S : never;

const END_INTERACTION = "endInteractionOnStop";

/** `machine` keeping its interaction emitters in its refs (`interaction`), ending what they have
 *  in progress when it stops (so a shared source doesn't stay pressed), and running `watch` after
 *  its own: where a machine ends what's in progress when it becomes disabled, and turns a
 *  highlight into hover. */
export function withInteraction<S extends MachineSchema, P>(
    machine: Machine<S>,
    watch?: (params: Params<S>, emitters: InteractionEmitters) => void,
): Machine<WithProps<S, P>> {
    const own = machine as unknown as Machine<MachineSchema>;
    const effects = own.effects;
    const wrapped: Machine<MachineSchema> = {
        ...own,
        effects:
            typeof effects === "function"
                ? (params) => [...(effects(params) ?? []), END_INTERACTION]
                : [...(effects ?? []), END_INTERACTION],
        implementations: {
            ...own.implementations,
            effects: {
                ...own.implementations?.effects,
                [END_INTERACTION]: (params: Params<MachineSchema>) => () =>
                    emittersOf(params).end(),
            },
        },
        refs: (params) => ({
            ...own.refs?.(params),
            interaction: new InteractionEmitters(
                params.prop as (key: string) => unknown,
            ),
        }),
        watch: (params) => {
            own.watch?.(params);
            watch?.(params as unknown as Params<S>, emittersOf(params));
        },
    };
    return wrapped as unknown as Machine<WithProps<S, P>>;
}

/** A running machine's emitters, as `withInteraction` keeps them. */
export const emittersOf = (service: {
    refs: Pick<Service<MachineSchema>["refs"], "get">;
}): InteractionEmitters =>
    (service.refs as { get(key: string): unknown }).get(
        "interaction",
    ) as InteractionEmitters;

/** `props` with `extra`'s handlers added: where both have one, `props`'s runs first. Both must be
 *  normalized by the same binding. */
export function chainProps<T>(props: T, extra: object): T {
    const chained: Record<string, unknown> = {
        ...(props as Record<string, unknown>),
    };
    for (const [key, added] of Object.entries(extra)) {
        const own = chained[key];
        chained[key] =
            typeof own === "function" && typeof added === "function"
                ? (...args: unknown[]) => {
                      own(...args);
                      added(...args);
                  }
                : (own ?? added);
    }
    return chained as T;
}

/** Whether a focus or blur event is the element's own, not one bubbling from inside it (the
 *  bindings listen to the bubbling `focusin` and `focusout`). */
export const isOwnFocusEvent = (event: {
    target: EventTarget | null;
    currentTarget: EventTarget | null;
}): boolean => event.target === event.currentTarget;

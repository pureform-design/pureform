// Each interactive component's interaction source, which its machine emits to: the app's, from the
// `interactionSource` prop, or one of its own, made when the component is created on the client
// and not on the server, where nothing emits.

import {
    createInteractionSource,
    createInteractionSources,
    type MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import {
    InteractionEmitter,
    pressableItemProps,
} from "@pureform/machines/interaction";
import { isServer } from "@solidjs/web";
import { type Accessor, createEffect, onCleanup, untrack } from "solid-js";

import { normalizeProps } from "./internal/zag";

/** A component's source: the app's when it passes one, else its own (none on the server). Pass it
 *  to the machine as `interactionSource` and to `useComponent`. */
export const useOwnInteractionSource = (
    given: Accessor<MutableInteractionSource | undefined>,
): Accessor<MutableInteractionSource | undefined> => {
    const own = isServer ? undefined : createInteractionSource();
    return () => given() ?? own;
};

/** A composite's sources, one per item: the app's for an item that passes one, else the
 *  composite's own (none on the server). */
export interface ItemInteractionSources {
    /** The machine props passing them: none on the server. */
    readonly machineProps: {
        itemInteractionSource?: (value: string) => MutableInteractionSource;
    };
    /** The source of the item with this value, from its `interactionSource` prop when given:
     *  call it from the item, which also tells the machine to emit to the app's. */
    item(
        value: Accessor<string>,
        given: Accessor<MutableInteractionSource | undefined>,
    ): Accessor<MutableInteractionSource | undefined>;
}

/** Makes a composite's sources, one per item. */
export const itemInteractionSources = (): ItemInteractionSources => {
    if (isServer) {
        return {
            machineProps: {},
            item: (_, given) => given,
        };
    }
    const own = createInteractionSources();
    const given = new Map<string, MutableInteractionSource>();
    return {
        machineProps: {
            itemInteractionSource: (value) => given.get(value) ?? own(value),
        },
        item: (value, source) => () => {
            const key = value();
            const app = source();
            if (app) given.set(key, app);
            else given.delete(key);
            return app ?? own(key);
        },
    };
};

/** The handlers that emit a plain element's presses, hover, and focus to `source`, for a surface
 *  no machine runs (a card, a list item, a snackbar's buttons): merge them into its part's
 *  machine props. A surface that becomes disabled ends what it has in progress. */
export const useInteractionHandlers = (
    source: Accessor<MutableInteractionSource | undefined>,
    disabled: Accessor<boolean>,
): Accessor<Readonly<Record<string, unknown>>> => {
    // The source when it emits, which may be in the effect below: a read, not a dependency.
    const emitter = new InteractionEmitter(() => untrack(source));
    onCleanup(() => emitter.end());
    createEffect(disabled, (now) => {
        if (now) emitter.end();
    });
    return () =>
        pressableItemProps({}, emitter, disabled(), normalizeProps) as Readonly<
            Record<string, unknown>
        >;
};

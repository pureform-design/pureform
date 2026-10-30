// Each interactive component's interaction source, which its machine emits to: the app's, from the
// `interactionSource` prop, or one of its own, made when the component first renders on the
// client and not on the server, where nothing emits.

import {
    createInteractionSource,
    createInteractionSources,
    type MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import {
    InteractionEmitter,
    pressableItemProps,
} from "@pureform/machines/interaction";
import { normalizeProps } from "@zag-js/react";
import { useEffect, useRef, useState } from "react";

import { isServer } from "./env";
import { combinePartProps } from "./props";

/** A component's source: the app's when it passes one, else its own (none on the server). Pass it
 *  to the machine as `interactionSource` and to `useComponent`. */
export function useOwnInteractionSource(
    given: MutableInteractionSource | undefined,
): MutableInteractionSource | undefined {
    const own = useState(() =>
        isServer ? undefined : createInteractionSource(),
    )[0];
    return given ?? own;
}

/** A composite's sources, one per item: the app's for an item that passes one, else the
 *  composite's own (none on the server). */
export interface ItemInteractionSources {
    /** The machine props passing them: none on the server. */
    readonly machineProps: {
        itemInteractionSource?: (value: string) => MutableInteractionSource;
    };
    /** The source of the item with this value, from its `interactionSource` prop when given:
     *  call it from the item while rendering, which also tells the machine to emit to the
     *  app's. */
    item(
        value: string,
        given: MutableInteractionSource | undefined,
    ): MutableInteractionSource | undefined;
}

const SERVER_SOURCES: ItemInteractionSources = {
    machineProps: {},
    item: (_, given) => given,
};

/** A composite's sources, one per item, the same on every render. */
export function useItemInteractionSources(): ItemInteractionSources {
    return useState((): ItemInteractionSources => {
        if (isServer) return SERVER_SOURCES;
        const own = createInteractionSources();
        const given = new Map<string, MutableInteractionSource>();
        return {
            machineProps: {
                itemInteractionSource: (value) =>
                    given.get(value) ?? own(value),
            },
            item(value, source) {
                if (source) given.set(value, source);
                else given.delete(value);
                return source ?? own(value);
            },
        };
    })[0];
}

/** The handlers that emit a plain element's presses, hover, and focus to `source`, for a surface
 *  no machine runs (a card, a list item, a snackbar's buttons): merge them into its part's
 *  machine props. A surface that becomes disabled ends what it has in progress. */
export function useInteractionHandlers(
    source: MutableInteractionSource | undefined,
    disabled: boolean,
    dragging = false,
): Readonly<Record<string, unknown>> {
    // The emitter reads the latest source at each emit.
    const latest = useRef(source);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks that run after render, not read while rendering
    latest.current = source;
    const [emitter] = useState(
        // oxlint-disable-next-line react/refs -- the callback reads the ref when it runs, after render
        () => new InteractionEmitter(() => latest.current),
    );
    useEffect(() => () => emitter.end(), [emitter]);
    useEffect(() => {
        if (disabled) emitter.end();
    }, [emitter, disabled]);
    useEffect(() => {
        if (dragging) {
            emitter.cancel();
            emitter.dragStart();
        } else emitter.dragStop();
    }, [emitter, dragging]);
    return pressableItemProps(
        {},
        emitter,
        disabled,
        normalizeProps,
    ) as Readonly<Record<string, unknown>>;
}

type Dict = Readonly<Record<string, unknown>>;

/** What a plain button part takes: the app's source, and its own `unstyled`. */
export interface MachineButtonProps {
    readonly interactionSource?: MutableInteractionSource | undefined;
    readonly unstyled?: boolean | undefined;
}

/** How a plain `<button>` part renders when no machine emits its interactions (a snackbar's and a
 *  toast's buttons, the split button's leading button, a chip's remove button): its own source,
 *  the handlers that emit to it, and `machine`'s props before them. Pass it to `scope.render`. */
export function useMachineButton(
    { unstyled, interactionSource, ...props }: MachineButtonProps,
    machine: readonly (Dict | undefined)[],
    disabled = false,
) {
    const source = useOwnInteractionSource(interactionSource);
    const handlers = useInteractionHandlers(source, disabled);
    return {
        element: "button",
        interactionSource: source,
        machine: combinePartProps([...machine, handlers]),
        unstyled,
        props,
    } as const;
}

// `usePresence(open)`: whether an overlay is present, on Zag's presence machine: open, or closed
// with its exit animation still running. Give `ref` the element that animates (the surface); the
// overlay's parts hide once presence lets it go, at once when no animation runs (an unstyled
// surface).

import { overlayPresent } from "@pureform/binding-core";
import * as presence from "@pureform/machines/presence";
import { type Accessor, createEffect, createMemo } from "solid-js";

import { normalizeProps, useMachine } from "./internal/zag";

/** An overlay's presence. */
export interface Presence {
    /** Open, or closed with its exit animation still running. */
    readonly present: Accessor<boolean>;
    /** The element whose animation presence waits for. */
    readonly ref: (element: HTMLElement) => void;
}

/** Whether an overlay with this `open` state is present. `onShow` runs with the surface once it
 *  shows. */
export function usePresence(
    open: Accessor<boolean>,
    onShow?: (surface: HTMLElement) => void,
): Presence {
    const service = useMachine(presence.machine, () => ({ present: open() }));
    const api = createMemo(() => presence.connect(service, normalizeProps));
    let node: HTMLElement | undefined;
    // The machine starts once the tree settles, after the surface's ref runs, so it's given the
    // surface each time it shows.
    createEffect(api, (current) => {
        if (!current.present || !node) return;
        current.setNode(node);
        onShow?.(node);
    });
    return {
        present: () => overlayPresent(open(), api().present),
        ref: (element) => {
            node = element;
        },
    };
}

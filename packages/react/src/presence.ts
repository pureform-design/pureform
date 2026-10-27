// `usePresence(open)`: whether an overlay is present, on Zag's presence machine: open, or closed
// with its exit animation still running. Give `ref` the element that animates (the surface); the
// overlay's parts hide once presence lets it go, at once when no animation runs (an unstyled
// surface).

import { overlayPresent } from "@pureform/binding-core";
import * as presence from "@pureform/machines/presence";
import { normalizeProps } from "@zag-js/react";
import { useCallback, useLayoutEffect, useRef } from "react";

import { useMachine } from "./machine";

/** An overlay's presence. */
export interface Presence {
    /** Open, or closed with its exit animation still running. */
    readonly present: boolean;
    /** The element whose animation presence waits for. */
    readonly ref: (element: HTMLElement | null) => void;
}

/** Whether an overlay with this `open` state is present. `onShow` runs with the surface once it
 *  shows, and may return what undoes it, which runs as it stops showing. */
export function usePresence(
    open: boolean,
    onShow?: (surface: HTMLElement) => (() => void) | void,
): Presence {
    const service = useMachine(presence.machine, { present: open });
    const api = presence.connect(service, normalizeProps);
    const node = useRef<HTMLElement | null>(null);
    const ref = useCallback((element: HTMLElement | null) => {
        node.current = element;
    }, []);
    // The machine starts after the surface's ref runs, so it's given the surface each time it
    // shows.
    const shown = api.present;
    const show = useRef(onShow);
    show.current = onShow;
    useLayoutEffect(() => {
        if (!shown || !node.current) return;
        api.setNode(node.current);
        return show.current?.(node.current) ?? undefined;
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs each time the surface shows; the api is new each render
    }, [shown]);
    return { present: overlayPresent(open, api.present), ref };
}

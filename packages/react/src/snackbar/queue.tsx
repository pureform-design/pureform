// The snackbar queue: `createSnackbarQueue()` holds the snackbars to show, in order, and
// `<SnackbarHost queue={…} />` shows them one at a time at the bottom of the screen, above
// `offset` (a navigation bar's or a FAB's room). Each closes after its duration (held while the
// pointer or focus is in it), by its action, its close button, Escape, or the app's `dismiss`;
// the next comes in once it has faded out.

import type {
    SnackbarHostPlacementProps,
    SnackbarQueueApi,
    SnackbarQueueOptions,
} from "@pureform/binding-core";
import * as snackbar from "@pureform/machines/snackbar";
import { type ReactNode, useSyncExternalStore } from "react";

import { Snackbar } from "./snackbar";

/** A snackbar to show through the queue. */
export type SnackbarOptions = SnackbarQueueOptions<ReactNode>;

/** A snackbar queue: `show` and `dismiss` for the app, and what `SnackbarHost` reads. */
export interface SnackbarQueue extends SnackbarQueueApi<SnackbarOptions> {
    /** The queue itself, on pureform's snackbar machine. */
    readonly queue: snackbar.Queue<SnackbarOptions>;
}

/** A new, empty snackbar queue. Show its snackbars with a `SnackbarHost`; make it once (outside
 *  a component, or in `useState`). */
export function createSnackbarQueue(): SnackbarQueue {
    const queue = snackbar.createQueue<SnackbarOptions>();
    return {
        queue,
        show: (options) => queue.show(options),
        dismiss: (id) => queue.dismiss(id, "close"),
    };
}

/** The host's props: the queue, and the room to leave below it. */
export interface SnackbarHostProps extends SnackbarHostPlacementProps<string> {
    readonly queue: SnackbarQueue;
}

/** Shows the queue's snackbars one at a time, centered at the bottom of the screen above
 *  `offset`. */
export function SnackbarHost(props: SnackbarHostProps): ReactNode {
    const { queue } = props.queue;
    const items = useSyncExternalStore(
        queue.subscribe,
        queue.items,
        queue.items,
    );
    const item = items[0];
    return (
        <div
            style={{
                position: "fixed",
                insetInline: 0,
                bottom: `calc(${props.offset ?? "0px"} + var(--spacing-4, 16px))`,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
            }}
        >
            {item ? (
                <Snackbar
                    key={item.id}
                    {...item.options}
                    style={{ root: { pointerEvents: "auto" } }}
                    open={item.closing === undefined}
                    onOpenChange={(details) => {
                        if (!details.open)
                            queue.dismiss(item.id, details.reason);
                    }}
                    onExitComplete={() => queue.gone(item.id)}
                />
            ) : null}
        </div>
    );
}

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
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, For, untrack } from "solid-js";

import { Snackbar } from "./snackbar";

/** A snackbar to show through the queue. */
export type SnackbarOptions = SnackbarQueueOptions<JSX.Element>;

/** A snackbar queue: `show` and `dismiss` for the app, and what `SnackbarHost` reads. */
export interface SnackbarQueue extends SnackbarQueueApi<SnackbarOptions> {
    /** The queue itself, on pureform's snackbar machine. */
    readonly queue: snackbar.Queue<SnackbarOptions>;
}

/** A new, empty snackbar queue. Show its snackbars with a `SnackbarHost`. */
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
export function SnackbarHost(props: SnackbarHostProps): JSX.Element {
    const queue = () => props.queue.queue;
    const [items, setItems] = createSignal(untrack(queue).items(), {
        equals: false,
    });
    // A new queue is followed, as React's `useSyncExternalStore` does: its items, then its changes.
    createEffect(queue, (current) =>
        untrack(() => {
            setItems(current.items());
            return current.subscribe(() => setItems(current.items()));
        }),
    );
    const shown = () => items().slice(0, 1);
    return (
        <div
            style={{
                position: "fixed",
                "inset-inline": "0",
                bottom: `calc(${props.offset ?? "0px"} + var(--spacing-4, 16px))`,
                display: "flex",
                "justify-content": "center",
                "pointer-events": "none",
            }}
        >
            <For each={shown()} keyed={(item) => item.id}>
                {(item) => {
                    // For is keyed by id, so a row's id never changes.
                    const { id } = untrack(item);
                    return (
                        <Snackbar
                            {...item().options}
                            // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                            style={{ root: { "pointer-events": "auto" } }}
                            open={item().closing === undefined}
                            onOpenChange={(details) => {
                                if (!details.open) {
                                    queue().dismiss(id, details.reason);
                                }
                            }}
                            onExitComplete={() => queue().gone(id)}
                        />
                    );
                }}
            </For>
        </div>
    );
}

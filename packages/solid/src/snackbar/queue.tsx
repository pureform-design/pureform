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
import { createSignal, For, onCleanup } from "solid-js";

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
    const [items, setItems] = createSignal(queue().items(), {
        equals: false,
    });
    onCleanup(queue().subscribe(() => setItems(queue().items())));
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
                    const { id } = item();
                    return (
                        <Snackbar
                            {...item().options}
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

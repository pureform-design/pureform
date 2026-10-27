// The snackbar queue: `useSnackbar().show(…)` adds a snackbar to the nearest portal host's queue,
// which shows one at a time at the bottom of the host's layer, over the page. Each closes after
// its duration (held while it's pressed or the pointer is over it, and counted again from the
// start once it's let go, as the web's machine does), by its action, its close button, or the
// app; the next comes in once it has faded out.

import type {
    SnackbarQueueApi,
    SnackbarQueueOptions,
} from "@pureform/binding-core";
import * as snackbar from "@pureform/machines/snackbar";
import { useTokens } from "@pureform/rn-adapter/react";
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { AccessibilityInfo, Platform, Pressable, View } from "react-native";

import { useLayer } from "../layer";
import { useHeldTimeout } from "../overlay";
import { usePortalHost } from "../portal-host";
import type { EdgeInsets, PortalStore } from "../portal-host";
import { usePresence } from "../presence";
import {
    PureformScopeProvider,
    useEngine,
    usePureformScope,
} from "../provider";
import type { PureformScope } from "../provider";
import { Snackbar } from "./snackbar";

/** A snackbar to show: its content, layout, how long it stays, and what to call; and `offset`,
 *  the room to leave below it (a navigation bar's or a FAB's), in points. */
export interface SnackbarOptions extends SnackbarQueueOptions<ReactNode> {
    /** The room to leave below it, above the host's bottom inset, such as a navigation bar's
     *  height. Default 0. */
    readonly offset?: number | undefined;
}

/** What `useSnackbar` gives. */
export type Snackbars = SnackbarQueueApi<SnackbarOptions>;

interface Queued extends SnackbarOptions {
    readonly scope: PureformScope | undefined;
}

type Item = snackbar.QueueItem<Queued>;

// A host's queue (pureform's snackbar queue, one at a time), in its layer while it holds a
// snackbar.
class Queue {
    readonly queue = snackbar.createQueue<Queued>();
    readonly #store: PortalStore;
    readonly #entry: number;
    #layer = 0;
    #order = 0;
    #held = false;

    constructor(store: PortalStore) {
        this.#store = store;
        this.#entry = store.nextId();
        this.queue.subscribe(() => this.#place());
    }

    show(
        options: SnackbarOptions,
        scope: PureformScope | undefined,
        layer: number,
    ): string {
        if (this.queue.items().length === 0) {
            this.#layer = layer;
            this.#order = this.#store.nextOrder();
        }
        return this.queue.show({ ...options, scope });
    }

    // In the host while it holds a snackbar.
    #place(): void {
        const holds = this.queue.items().length > 0;
        if (holds && !this.#held) {
            this.#store.set(this.#entry, {
                key: [[this.#layer, this.#order]],
                node: <Shown queue={this.queue} />,
            });
        } else if (!holds && this.#held) {
            this.#store.remove(this.#entry);
        }
        this.#held = holds;
    }
}

const queues = new WeakMap<PortalStore, Queue>();

// The snackbar at the front of the queue, in the provider `show` was called under.
function Shown(props: { readonly queue: snackbar.Queue<Queued> }): ReactNode {
    const { queue } = props;
    const items = useSyncExternalStore(
        queue.subscribe,
        queue.items,
        queue.items,
    );
    const host = usePortalHost();
    const shown = items[0];
    if (!shown || !host) return null;
    return (
        <PureformScopeProvider scope={shown.options.scope}>
            <QueuedSnackbar
                key={shown.id}
                item={shown}
                queue={queue}
                insets={host.insets}
            />
        </PureformScopeProvider>
    );
}

function QueuedSnackbar(props: {
    readonly item: Item;
    readonly queue: snackbar.Queue<Queued>;
    readonly insets: EdgeInsets;
}): ReactNode {
    const { item, queue, insets } = props;
    const { options } = item;
    const {
        duration = 5000,
        onAction,
        onOpenChange: _onOpenChange,
        scope: _scope,
        offset = 0,
        ...surface
    } = options;
    const open = item.closing === undefined;
    const engine = useEngine();
    const presence = usePresence(open, "popup");
    const margin = Number(useTokens()["spacing.4"] ?? 16) || 16;
    const { holdProps } = useHeldTimeout(open, duration, () =>
        queue.dismiss(item.id, "timeout"),
    );
    useLayoutEffect(() => {
        if (!presence.present) queue.gone(item.id);
    }, [presence.present, queue, item.id]);
    useEffect(() => {
        // VoiceOver has no live regions; TalkBack and the web read the snackbar's own.
        if (
            Platform.OS === "ios" &&
            typeof options.supportingText === "string"
        ) {
            AccessibilityInfo.announceForAccessibility(options.supportingText);
        }
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- announced once, as the snackbar shows
    }, []);
    return (
        <View
            pointerEvents="box-none"
            style={{
                position: "absolute",
                left: insets.left + margin,
                right: insets.right + margin,
                bottom: insets.bottom + offset + margin,
                alignItems: "center",
            }}
        >
            <engine.View
                {...presence.props}
                style={{
                    // A closing snackbar takes no more presses.
                    pointerEvents: open ? "auto" : "none",
                    maxWidth: "100%",
                    ...presence.style,
                }}
            >
                <Pressable {...holdProps}>
                    <Snackbar
                        {...surface}
                        onAction={() => {
                            onAction?.();
                            queue.dismiss(item.id, "action");
                        }}
                        onClose={() => queue.dismiss(item.id, "close")}
                    />
                </Pressable>
            </engine.View>
        </View>
    );
}

/** The nearest portal host's snackbar queue (the root provider's, or a `Modal`'s own host's):
 *  `const snackbars = useSnackbar(); snackbars.show({ supportingText: "Archived", action:
 *  "Undo", onAction: undo })`. Each shows in the provider `useSnackbar` was called under. */
export function useSnackbar(): Snackbars {
    const host = usePortalHost();
    if (!host) {
        throw new Error(
            "pureform: useSnackbar needs a PureformProvider around it, which holds the snackbars' host.",
        );
    }
    const scope = usePureformScope();
    const layer = useLayer("snackbar") ?? 0;
    const latest = useRef({ scope, layer });
    useLayoutEffect(() => {
        latest.current = { scope, layer };
    });
    return useMemo(() => {
        const queue = (): Queue => {
            let found = queues.get(host.store);
            if (!found) queues.set(host.store, (found = new Queue(host.store)));
            return found;
        };
        return {
            show: (options) =>
                queue().show(
                    options,
                    latest.current.scope,
                    latest.current.layer,
                ),
            dismiss: (id) => queue().queue.dismiss(id, "close"),
        };
    }, [host.store]);
}

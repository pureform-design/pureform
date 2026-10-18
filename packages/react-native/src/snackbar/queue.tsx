// The snackbar queue: `useSnackbar().show(…)` adds a snackbar to the nearest portal host's queue,
// which shows one at a time at the bottom of the host's layer, over the page. Each closes after
// its duration (held while it's pressed or the pointer is over it, and counted again from the
// start once it's let go, as the web's machine does), by its action, its close button, or the
// app; the next comes in once it has faded out.

import type { TestIdOverride } from "@pureform/anatomy";
import type {
    IndicationProps,
    SnackbarOpenChangeDetails,
    SnackbarOpenChangeReason,
    SnackbarPart,
    SnackbarVariantProps,
} from "@pureform/binding-core";
import { useTokens } from "@pureform/rn-adapter/react";
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { AccessibilityInfo, Platform, Pressable, View } from "react-native";

import { useLayer } from "../layer";
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

/** A snackbar to show: its content, how long it stays, and what to call. */
export interface SnackbarOptions extends SnackbarVariantProps, IndicationProps {
    /** The message. */
    readonly supportingText: ReactNode;
    /** The action's label; the action shows only when given. */
    readonly action?: ReactNode;
    /** Called when the user chooses the action, before the snackbar closes. */
    readonly onAction?: (() => void) | undefined;
    /** The close button's name for assistive technology. Default "Dismiss". */
    readonly closeLabel?: string | undefined;
    readonly closeIcon?: ReactNode;
    /** How long it stays, in milliseconds, while it isn't held. `null` keeps it until the user or
     *  the app closes it. Default 5000, as the web's. */
    readonly duration?: number | null | undefined;
    /** Called once it closes, with why: `timeout`, `action`, or `close` (its close button, or
     *  the app's `dismiss`). */
    readonly onOpenChange?:
        | ((details: SnackbarOpenChangeDetails) => void)
        | undefined;
    readonly testId?: TestIdOverride<SnackbarPart> | undefined;
}

/** What `useSnackbar` gives. */
export interface Snackbars {
    /** Adds a snackbar to the queue, shown once those before it have gone. Returns its id. */
    show(options: SnackbarOptions): string;
    /** Closes the snackbar with this id, or the one showing; one still waiting leaves the queue
     *  unseen. */
    dismiss(id?: string): void;
}

interface Queued {
    readonly id: string;
    readonly options: SnackbarOptions;
    readonly scope: PureformScope | undefined;
    /** Why it's closing, once it is. */
    readonly closing?: SnackbarOpenChangeReason;
}

// A host's queue, in its layer while it holds a snackbar.
class Queue {
    items: readonly Queued[] = [];
    readonly #listeners = new Set<() => void>();
    readonly #store: PortalStore;
    readonly #entry: number;
    #layer = 0;
    #order = 0;
    #ids = 0;

    constructor(store: PortalStore) {
        this.#store = store;
        this.#entry = store.nextId();
    }

    readonly subscribe = (listener: () => void): (() => void) => {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    };

    show(
        options: SnackbarOptions,
        scope: PureformScope | undefined,
        layer: number,
    ): string {
        const id = `snackbar-${++this.#ids}`;
        if (this.items.length === 0) {
            this.#layer = layer;
            this.#order = this.#store.nextOrder();
        }
        this.#set([...this.items, { id, options, scope }]);
        return id;
    }

    close(id: string | undefined, reason: SnackbarOpenChangeReason): void {
        const [shown] = this.items;
        const target = id ?? shown?.id;
        if (target === undefined) return;
        if (shown?.id !== target) {
            // Never shown: it leaves unseen.
            this.#set(this.items.filter((item) => item.id !== target));
            return;
        }
        if (shown.closing) return;
        this.#set([{ ...shown, closing: reason }, ...this.items.slice(1)]);
        shown.options.onOpenChange?.({ open: false, reason });
    }

    /** The shown snackbar has faded out. */
    gone(id: string): void {
        if (this.items[0]?.id === id) this.#set(this.items.slice(1));
    }

    #set(items: readonly Queued[]): void {
        const was = this.items.length > 0;
        this.items = items;
        if (items.length > 0 && !was) {
            this.#store.set(this.#entry, {
                key: [[this.#layer, this.#order]],
                node: <Shown queue={this} />,
            });
        } else if (items.length === 0 && was) {
            this.#store.remove(this.#entry);
        }
        for (const listener of this.#listeners) listener();
    }
}

const queues = new WeakMap<PortalStore, Queue>();

// The snackbar at the front of the queue, in the provider `show` was called under.
function Shown(props: { readonly queue: Queue }): ReactNode {
    const { queue } = props;
    const items = useSyncExternalStore(
        queue.subscribe,
        () => queue.items,
        () => queue.items,
    );
    const host = usePortalHost();
    const shown = items[0];
    if (!shown || !host) return null;
    return (
        <PureformScopeProvider scope={shown.scope}>
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
    readonly item: Queued;
    readonly queue: Queue;
    readonly insets: EdgeInsets;
}): ReactNode {
    const { item, queue, insets } = props;
    const { options } = item;
    const {
        duration = 5000,
        onAction,
        onOpenChange: _onOpenChange,
        ...surface
    } = options;
    const open = item.closing === undefined;
    const engine = useEngine();
    const presence = usePresence(open, "popup");
    const margin = Number(useTokens()["spacing.4"] ?? 16) || 16;
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);
    const held = hovered || pressed;
    useEffect(() => {
        if (!open || held || duration === null || !Number.isFinite(duration)) {
            return undefined;
        }
        const timer = setTimeout(
            () => queue.close(item.id, "timeout"),
            duration,
        );
        return () => clearTimeout(timer);
    }, [open, held, duration, queue, item.id]);
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
    }, []);
    return (
        <View
            pointerEvents="box-none"
            style={{
                position: "absolute",
                left: insets.left + margin,
                right: insets.right + margin,
                bottom: insets.bottom + margin,
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
                <Pressable
                    accessible={false}
                    focusable={false}
                    onHoverIn={() => setHovered(true)}
                    onHoverOut={() => setHovered(false)}
                    onPressIn={() => setPressed(true)}
                    onPressOut={() => setPressed(false)}
                >
                    <Snackbar
                        {...surface}
                        onAction={() => {
                            onAction?.();
                            queue.close(item.id, "action");
                        }}
                        onClose={() => queue.close(item.id, "close")}
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
            dismiss: (id) => queue().close(id, "close"),
        };
    }, [host.store]);
}

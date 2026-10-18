// The host overlays render in: the app's content, then a layer over it with what each portal gives
// it, ordered by the theme's stacking layers and then by when each opened. React Native has no DOM
// portals, so a portal hands its children to the nearest host, which renders them in that layer.
// The root `PureformProvider` holds one; a `Modal` that shows overlays needs its own inside.

import {
    createContext,
    Fragment,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import type { ComponentRef, ReactNode } from "react";
import { StyleSheet, View } from "react-native";

/** A box in the window's coordinates, as `measureInWindow` gives it. */
export interface WindowRect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** What overlays keep clear of at each edge, such as the safe area's insets. */
export interface OverlayInsets {
    readonly top?: number | undefined;
    readonly right?: number | undefined;
    readonly bottom?: number | undefined;
    readonly left?: number | undefined;
}

/** Where a portal's entry sorts: its stacking layer's z-index and the order it opened in, after
 *  those of the portals it's inside, outermost first. So an overlay opened from another draws
 *  over it, as an element inside a stacking context does on the web. */
export type PortalKey = readonly (readonly [layer: number, order: number])[];

interface Entry {
    readonly key: PortalKey;
    readonly node: ReactNode;
}

type Sorted = readonly (readonly [id: number, entry: Entry])[];

const compareKeys = (a: PortalKey, b: PortalKey): number => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const [layerA, orderA] = a[i]!;
        const [layerB, orderB] = b[i]!;
        if (layerA !== layerB) return layerA - layerB;
        if (orderA !== orderB) return orderA - orderB;
    }
    return a.length - b.length;
};

/** A host's entries and the box its layer takes in the window, which overlays place themselves
 *  in. */
export class PortalStore {
    readonly #entries = new Map<number, Entry>();
    #sorted: Sorted = [];
    #bounds: WindowRect | undefined;
    #order = 0;
    #ids = 0;
    readonly #listeners = new Set<() => void>();

    /** A new entry's id. */
    nextId(): number {
        return ++this.#ids;
    }

    /** The order the next portal opens in. */
    nextOrder(): number {
        return ++this.#order;
    }

    set(id: number, entry: Entry): void {
        this.#entries.set(id, entry);
        this.#changed();
    }

    remove(id: number): void {
        if (this.#entries.delete(id)) this.#changed();
    }

    /** The entries, lowest first. The same array while none changes. */
    get entries(): Sorted {
        return this.#sorted;
    }

    /** The layer's box in the window, once it's laid out. */
    get bounds(): WindowRect | undefined {
        return this.#bounds;
    }

    setBounds(bounds: WindowRect | undefined): void {
        const now = this.#bounds;
        if (
            now === bounds ||
            (now &&
                bounds &&
                now.x === bounds.x &&
                now.y === bounds.y &&
                now.width === bounds.width &&
                now.height === bounds.height)
        ) {
            return;
        }
        this.#bounds = bounds;
        this.#notify();
    }

    readonly subscribe = (listener: () => void): (() => void) => {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    };

    #changed(): void {
        this.#sorted = [...this.#entries].sort(([, a], [, b]) =>
            compareKeys(a.key, b.key),
        );
        this.#notify();
    }

    #notify(): void {
        for (const listener of this.#listeners) listener();
    }
}

/** Insets with every edge given. */
export interface EdgeInsets {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
}

/** What a host gives the portals and overlays under it. */
export interface PortalHostValue {
    readonly store: PortalStore;
    readonly insets: EdgeInsets;
}

const HostContext = createContext<PortalHostValue | null>(null);

/** The nearest host, `null` outside one. */
export const usePortalHost = (): PortalHostValue | null =>
    useContext(HostContext);

/** Whether a host is above. */
export const useHasPortalHost = (): boolean => useContext(HostContext) !== null;

/** The nearest host's layer, in the window; `undefined` until it's laid out. */
export const useHostBounds = (
    host: PortalHostValue | null,
): WindowRect | undefined => {
    const subscribe = useMemo(
        () => host?.store.subscribe ?? (() => () => {}),
        [host],
    );
    const read = () => host?.store.bounds;
    return useSyncExternalStore(subscribe, read, read);
};

export interface PortalHostProps {
    /** What overlays keep clear of: the snackbar sits above the bottom inset, and menus and
     *  tooltips stay inside them all. Pass the safe area's (`useSafeAreaInsets()` from
     *  react-native-safe-area-context). Default none. */
    readonly insets?: OverlayInsets | undefined;
    readonly children?: ReactNode;
}

/**
 * Where portals under it render: after `children`, in a layer over the view that holds them. The
 * root `PureformProvider` places one around the app; place your own around the provider to give
 * it `insets`, or inside a `Modal` whose content opens overlays (a `Modal` is a window of its
 * own on a device, which the root's layer can't draw over).
 *
 * ```tsx
 * <PortalHost insets={useSafeAreaInsets()}>
 *     <PureformProvider registry={registry}>…</PureformProvider>
 * </PortalHost>
 * ```
 */
export function PortalHost(props: PortalHostProps): ReactNode {
    const [store] = useState(() => new PortalStore());
    const { top = 0, right = 0, bottom = 0, left = 0 } = props.insets ?? {};
    const value = useMemo(
        () => ({ store, insets: { top, right, bottom, left } }),
        [store, top, right, bottom, left],
    );
    const entries = useSyncExternalStore(
        store.subscribe,
        () => store.entries,
        () => store.entries,
    );
    const layer = useRef<ComponentRef<typeof View>>(null);
    const shown = entries.length > 0;
    useEffect(() => {
        // The layer goes with the last entry; the next is measured again.
        if (!shown) store.setBounds(undefined);
    }, [store, shown]);
    const measure = () =>
        layer.current?.measureInWindow((x, y, width, height) =>
            store.setBounds({ x, y, width, height }),
        );
    const zIndex = Math.max(0, ...entries.map(([, entry]) => entry.key[0]![0]));
    return (
        <HostContext value={value}>
            {props.children}
            {shown ? (
                <View
                    ref={layer}
                    pointerEvents="box-none"
                    style={[StyleSheet.absoluteFill, { zIndex }]}
                    onLayout={measure}
                >
                    {entries.map(([id, entry]) => (
                        <Fragment key={id}>{entry.node}</Fragment>
                    ))}
                </View>
            ) : null}
        </HostContext>
    );
}

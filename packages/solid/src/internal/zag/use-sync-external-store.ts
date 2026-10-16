// An external store's snapshot as a signal, as in @zag-js/solid 1.46.0 (MIT): it reads the
// snapshot once settled (Solid 1's `onMount`), and again on every change.

import { type Accessor, createSignal, onSettled } from "solid-js";

export function useSyncExternalStore<T>(
    subscribe: (onChange: VoidFunction) => VoidFunction,
    getSnapshot: () => T,
    _getServerSnapshot?: () => T,
): Accessor<T> {
    // Boxed, since Solid 2 treats a function passed to `createSignal` as a computation.
    const [snapshot, setSnapshot] = createSignal<{ v: T }>({
        v: getSnapshot(),
    });
    onSettled(() => {
        setSnapshot({ v: getSnapshot() });
        return subscribe(() => setSnapshot({ v: getSnapshot() }));
    });
    return () => snapshot().v;
}

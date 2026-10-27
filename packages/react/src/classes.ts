// The style registry's hooks. `useClasses` is what components use: the slot classes for a
// selection, over the provider's defaults, memoized on the selection's value. A static entry
// answers at once; a lazy entry suspends to the nearest `<Suspense>` with `use()` until its chunk
// loads (on the server too, so the server renders its classes).

import {
    selectionSignature,
    warnOnce,
    withDefaults,
} from "@pureform/binding-core";
import {
    classEntry,
    lazyFactoryError,
    serverLazyFactoryMessage,
} from "@pureform/binding-web";
import type {
    ComponentName,
    LazyComponentName,
    Selection,
    StaticComponentName,
} from "@pureform/styling";
import type { ClassFactory, ClassSlots } from "@pureform/styling-web";
import { use, useMemo } from "react";

import { isDev, isServer } from "./env";
import { useComponentState } from "./provider";

/** Each slot's classes for `selection`, over the provider's `defaults` for the component. The
 *  selection can be a new object every render: the call is memoized on its value. A lazy entry
 *  needs a `<Suspense>` boundary above it. */
export function useClasses<N extends ComponentName>(
    name: N,
    selection: Selection<N>,
): ClassSlots<N> {
    const state = useComponentState();
    const entry = classEntry(state, name);
    const factory = entry.kind === "static" ? entry.factory : use(entry.load());
    const selected = withDefaults<N>(
        state.defaults[name] as Selection<N> | undefined,
        selection,
    );
    const signature = selectionSignature(selected);
    // `selected` is a new object every render; its signature says when it changed.
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed by the contents' key on purpose, not the array's identity (the selection's signature)
    return useMemo(() => factory(selected), [factory, signature]);
}

/** A static entry's factory, to call outside rendering: in tests, handlers, scripts. Throws for a
 *  lazy entry, whose factory is client-only (`useLazyClassFactory`). */
export function useClassFactory<N extends StaticComponentName>(
    name: N,
): ClassFactory<N> {
    const entry = classEntry(useComponentState(), name);
    if (entry.kind === "lazy") throw lazyFactoryError(name);
    return entry.factory;
}

/** A lazy entry's factory, loaded on the client: it suspends to the nearest `<Suspense>` until
 *  the chunk loads. On the server it throws, so the boundary renders its fallback there and the
 *  client renders it after hydrating (a factory can't be serialized); in development it warns
 *  first. A static entry's factory comes back at once. */
export function useLazyClassFactory<N extends LazyComponentName>(
    name: N,
): ClassFactory<N> {
    const entry = classEntry(useComponentState(), name);
    if (isDev && isServer) warnOnce(serverLazyFactoryMessage(name));
    if (entry.kind === "static") return entry.factory;
    if (isServer) {
        throw new Error(
            `pureform: useLazyClassFactory("${name}") loads on the client only; its <Suspense> boundary renders the fallback on the server.`,
        );
    }
    return use(entry.load());
}

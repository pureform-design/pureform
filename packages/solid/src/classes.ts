// The style registry's hooks. `useClasses` is what components use: a memo of the slot classes for
// a selection, over the provider's defaults. A static entry gives a plain memo; a lazy entry an
// async one, which suspends to the nearest `<Loading>` and resolves to classes (plain data, which
// Solid serializes for hydration), never to the factory.

import {
    requireRegistry,
    warnOnce,
    withDefaults,
} from "@pureform/binding-core";
import type {
    ClassFactory,
    ClassSlots,
    ComponentName,
    LazyComponentName,
    RegistryEntry,
    Selection,
    StaticComponentName,
} from "@pureform/styling";
import { isDev, isServer } from "@solidjs/web";
import { type Accessor, createMemo, untrack } from "solid-js";

import { usePureform } from "./provider";

const entryOf = <N extends ComponentName>(
    name: N,
): RegistryEntry<ClassFactory<N>> => {
    const state = usePureform();
    return untrack(() => requireRegistry(state()).entry(name)) as RegistryEntry<
        ClassFactory<N>
    >;
};

/** Each slot's classes for `selection`, over the provider's `defaults` for the component. The
 *  entry's kind is read once: a static entry gives a plain memo, a lazy one an async memo that
 *  needs a `<Loading>` boundary above it. */
export function useClasses<N extends ComponentName>(
    name: N,
    selection: Accessor<Selection<N>>,
): Accessor<ClassSlots<N>> {
    const state = usePureform();
    const entry = entryOf(name);
    const select = () =>
        withDefaults<N>(
            state().defaults[name] as Selection<N> | undefined,
            selection(),
        );
    if (entry.kind === "static") {
        return createMemo(() => entry.factory(select()));
    }
    return createMemo(async () => {
        const current = select(); // tracked before the await
        return (await entry.load())(current);
    });
}

/** A static entry's factory, to call outside rendering: in tests, handlers, scripts. Throws for a
 *  lazy entry, whose factory is client-only (`useLazyClassFactory`). */
export function useClassFactory<N extends StaticComponentName>(
    name: N,
): ClassFactory<N> {
    const entry = entryOf(name);
    if (entry.kind === "lazy") {
        throw new Error(
            `pureform: "${name}" loads on demand, so its factory isn't there yet. Use useLazyClassFactory("${name}"), or useClasses for classes.`,
        );
    }
    return entry.factory;
}

/** A lazy entry's factory, loaded on the client. On the server it suspends to the nearest
 *  `<Loading>` boundary, whose fallback renders, and the client loads it after hydrating (a
 *  factory can't be serialized). In development it warns when it runs on the server. */
export function useLazyClassFactory<N extends LazyComponentName>(
    name: N,
): Accessor<ClassFactory<N>> {
    const entry = entryOf(name);
    if (isDev && isServer) {
        warnOnce(
            `pureform: useLazyClassFactory("${name}") ran during a server render. A factory can't be serialized, so its boundary renders the fallback on the server and loads on the client; use useClasses for classes that render on the server.`,
        );
    }
    if (entry.kind === "static") {
        const { factory } = entry;
        return () => factory;
    }
    const loaded = createMemo(async () => ({ factory: await entry.load() }), {
        ssrSource: "client",
    });
    return () => loaded().factory;
}

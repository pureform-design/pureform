// The runtime every binding and generated factory uses, free of any framework and target: the
// factory types, the registry, and a per-selection cache. Web factory outputs, CSS vars, runtime
// CSS themes, and the web registry's options are `@pureform/styling-web`'s.
export { selectionCache, selectionKey, deepFreeze } from "./cache";
export type { SelectionCache, SelectionOrder } from "./cache";
export { VERSION } from "./package-version";
export { createRegistry } from "./registry";
export type {
    AnyFactory,
    EntryOf,
    FactoryOf,
    LazyEntry,
    LazyEntryName,
    LazyInput,
    Registry,
    RegistryEntry,
    RegistryInput,
    RegistryOptions,
    StaticEntry,
    StaticEntryName,
} from "./registry";
export type * from "./types";

// Types for `virtual:pureform/registry`, the generated index the bundler plugin serves. Add
// "@pureform/bundler/client" to `types` in tsconfig.json. The registry's components are typed
// by `.pureform/registry.d.ts` (include `.pureform/**/*` in tsconfig.json). For the index's own
// types instead, map the id with `paths` and leave this file out:
// `"virtual:pureform/registry": ["./.pureform/index.ts"]`.

declare module "virtual:pureform/registry" {
    import type {
        AnyFactory,
        ComponentRegistry,
        LazyInput,
        Registry,
    } from "@pureform/styling";

    /** The generated registry, for `PureformProvider`. */
    export const registry: Registry<{
        readonly [N in keyof ComponentRegistry & string]:
            | AnyFactory
            | LazyInput;
    }>;
    /** The core's version the registry was made with. */
    export const version: string;
    /** The config's theme names. */
    export const themes: readonly string[];
    /** The registered components' names. */
    export type Components = keyof ComponentRegistry & string;
}

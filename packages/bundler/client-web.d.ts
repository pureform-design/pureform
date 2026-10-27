// Types for `virtual:pureform/registry` on a web target (CSS, Tailwind, Panda), whose generated
// index makes a web registry: the neutral one plus the target's theme attribute and var prefixes,
// which the web providers read. Add "@pureform/bundler/client-web" to `types` in tsconfig.json
// instead of "@pureform/bundler/client" (never both: each declares the module), with
// `@pureform/styling-web` installed. The registry's components are typed by
// `.pureform/registry.d.ts` (include `.pureform/**/*` in tsconfig.json).

declare module "virtual:pureform/registry" {
    import type {
        AnyFactory,
        ComponentRegistry,
        LazyInput,
    } from "@pureform/styling";
    import type { WebRegistry } from "@pureform/styling-web";

    /** The generated registry, for `PureformProvider`. */
    export const registry: WebRegistry<{
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

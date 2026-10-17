// The adapter codegen interface: what an adapter's `/codegen` subpath exports, what it's given,
// and what it returns. `generate` loads the config, asks the adapter for its modules, and writes
// them to `.pureform/` with the header, the registry index, and the declarations.

import type { CoreConfig } from "@pureform/core/types";

/** Where the generated factories run: `web` modules export a `ClassFactory`, `native` modules a
 *  `StyleFactory`. */
export type Platform = "web" | "native";

/** The build targets, each served by one adapter's `/codegen` subpath. */
export type Target = "panda" | "css" | "tailwind" | "native";

/** The package whose `/codegen` subpath serves each target. */
export const TARGET_PACKAGES = {
    panda: "@pureform/panda-adapter",
    css: "@pureform/css-adapter",
    tailwind: "@pureform/tailwind-adapter",
    native: "@pureform/rn-adapter",
} as const satisfies Record<Target, string>;

/** A component's shape, read from the config. The generated declarations augment
 *  `@pureform/styling`'s `ComponentRegistry` with it, each list becoming a string union. */
export interface ComponentShape {
    /** Each variant group's values, in the config's order. A group of `"true"` and `"false"`
     *  also takes booleans. */
    readonly variants: Readonly<Record<string, readonly string[]>>;
    /** Each group's default value, from the recipe's `defaultVariants`. Not declared; adapters
     *  pass it to `selectionCache`. */
    readonly defaults: Readonly<Record<string, string>>;
    /** The slots, in the config's order: `["root"]` for a single-slot component. */
    readonly slots: readonly string[];
    /** The states the selection carries. Leave it out on the web, where states aren't part of
     *  the selection; native factories list the states they read. */
    readonly states?: readonly string[];
    /** The tokens an instance may set (`selection.tokens`): the keys of the component's
     *  `tokens`. */
    readonly tokens: readonly string[];
}

/** What an adapter's codegen is given. */
export interface CodegenContext<Options = Record<string, unknown>> {
    /** The loaded config. Pure data: don't mutate it. */
    readonly config: CoreConfig;
    /** The components to generate, in the config's order: every component, or the build's
     *  allow-list. Generate a module for each of these and no others. */
    readonly components: readonly string[];
    /** The adapter's own build options, as the bundler plugin or the CLI passed them (`prefix`,
     *  `classPrefix`, …). They're part of the header hash. */
    readonly options: Options;
    /** The app's root, absolute. */
    readonly root: string;
    /** The folder being written, absolute (`<root>/.pureform` by default). */
    readonly outDir: string;
    /** A component's shape, derived from the config. */
    shape(name: string): ComponentShape;
    /** The import specifier from a generated file to another file: `from` is relative to
     *  `outDir` (`"web/button.ts"`), `to` is absolute or relative to `root`
     *  (`"styled-system/recipes/button"`). Gives `"../../styled-system/recipes/button"`. */
    importPath(from: string, to: string): string;
}

/** One component's factory module. */
export interface ComponentModule {
    /** The component's name in the config, and its name in the registry. */
    readonly name: string;
    /** The file, relative to `outDir`, with `/` separators: `"web/button.ts"`. A `.ts`, `.tsx`,
     *  `.js`, or `.mjs` file. */
    readonly path: string;
    /** The module's source, without the generated header (`generate` adds it). It must export
     *  the factory under `exportName`. */
    readonly contents: string;
    /** The factory's export name. Default: `name`. */
    readonly exportName?: string;
    /** The shape to declare. Default: `context.shape(name)`. Return it to add `states` (native)
     *  or to narrow what the config gives. */
    readonly shape?: ComponentShape;
}

/** Any other file an adapter writes: build-time modules (Panda's `staticCss`), stylesheets,
 *  tables a factory imports. */
export interface GeneratedFile {
    /** Relative to `outDir`, with `/` separators. */
    readonly path: string;
    /** The source, without the generated header. */
    readonly contents: string;
    /** Whether to add the generated header. Default `true`; turn it off for formats without
     *  comments, such as JSON. The header's comment syntax follows the extension (`.css` gets a
     *  block comment, everything else line comments). */
    readonly header?: boolean;
}

/** What an adapter's codegen returns. */
export interface CodegenOutput {
    /** One module per component in `context.components`. */
    readonly components: readonly ComponentModule[];
    /** Other files, written alongside. */
    readonly files?: readonly GeneratedFile[];
    /** The attribute the target's stylesheet scopes named themes with (`data-theme`). The index
     *  passes it to the registry, whose `themeAttributes(name)` providers write. Leave it out on
     *  targets without selectors. */
    readonly themeAttribute?: string;
}

/** What an adapter's `/codegen` subpath exports as `codegen` (or as its default export). */
export interface CodegenAdapter<Options = Record<string, unknown>> {
    /** The adapter's name in messages: `"panda"`. */
    readonly name: string;
    /** Whether its factories are `ClassFactory` (web) or `StyleFactory` (native). */
    readonly platform: Platform;
    /** Generate the factory modules. Pure: the same context gives the same output, and it
     *  writes nothing itself. */
    codegen(
        context: CodegenContext<Options>,
    ): CodegenOutput | Promise<CodegenOutput>;
}

/** Declares an adapter's codegen with its options typed:
 *  `export const codegen = defineCodegen<PandaCodegenOptions>({ name: "panda", … })`. */
export const defineCodegen = <Options = Record<string, unknown>>(
    adapter: CodegenAdapter<Options>,
): CodegenAdapter<Options> => adapter;

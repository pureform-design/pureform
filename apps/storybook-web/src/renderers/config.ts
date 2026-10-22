// `stories.config.ts`'s shape. Read by the codegen (under Node), so it imports nothing at run time.

import type { ArgTypes } from "@storybook/html-vite";

import type { Args } from "./types";

export interface RendererConfig {
    /** The binding package. A component `Foo` comes from its `./foo` export, named `Foo`. */
    readonly package: string;
    /** The module exporting the adapter, relative to the app. */
    readonly adapter: string;
    /** The adapter's export name. */
    readonly export: string;
    /** The renderer's hook module, the binding's `storybook` export. */
    readonly hooks?: string;
    /** `false` where the cases' readers can't read the renderer's DOM (they read the web
     *  bindings' native elements, ARIA and data attributes): its stories run without the
     *  generated play tests. The a11y checks still run. */
    readonly casePlays?: boolean;
}

/** Overrides for one component; everything else comes from its anatomy and its case. */
export interface ComponentConfig {
    /** Args for every story of the component, over the case's props and the shared and
     *  renderer hooks'. */
    readonly args?: Args;
    /** Arg types over the ones from the anatomy's variants. */
    readonly argTypes?: Partial<ArgTypes>;
    /** Anatomy variants that aren't props (derived by the binding): no control for them. */
    readonly controls?: { readonly exclude?: readonly string[] };
    /** Scheme-pinned copies of `Default` (`Light`, `Dark`) with the state's play: they set the
     *  story's `globals.scheme`, which overrides (and locks) the toolbar's. */
    readonly schemes?: readonly ("light" | "dark")[];
    /** Pins every story of the component to a scheme (the meta's `globals`). */
    readonly scheme?: "light" | "dark";
    /** Story fields by export name, merged into the generated story (plain data):
     *  `{ Disabled: { parameters: { a11y: { test: "todo" } } } }`. */
    readonly stories?: Readonly<
        Record<string, Readonly<Record<string, unknown>>>
    >;
    /** The component's hook modules, relative to the app, after the renderers'. */
    readonly hooks?: readonly string[];
}

export interface StoriesConfig {
    readonly renderers: Readonly<Record<string, RendererConfig>>;
    /** The components to draw, by export name; left out: every one with an anatomy and a case. */
    readonly include?: readonly string[];
    /** Components to leave out. */
    readonly skip?: readonly string[];
    /** Overrides by component. */
    readonly components?: Readonly<Record<string, ComponentConfig>>;
    /** Shared hook modules, relative to the app: they apply to every renderer, first. */
    readonly hooks?: readonly string[];
}

export const defineStories = (config: StoriesConfig): StoriesConfig => config;

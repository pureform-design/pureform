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
}

export interface ComponentConfig {
    /** Args for every story of the component, over the shared and renderer hooks'. */
    readonly args?: Args;
    readonly argTypes?: Partial<ArgTypes>;
    /** The `variant` prop's values: a control, and one story each besides `Default`. */
    readonly variants?: readonly string[];
    /** Scheme-pinned stories next to `Default` (`Light`, `Dark`): they set the story's
     *  `globals.scheme`, which overrides (and locks) the toolbar's, and run the shared tests. */
    readonly schemes?: readonly ("light" | "dark")[];
    /** Pins every story of the component to a scheme (the meta's `globals`). */
    readonly scheme?: "light" | "dark";
    /** The component's hook modules, relative to the app, after the renderers'. */
    readonly hooks?: readonly string[];
}

export interface StoriesConfig {
    readonly renderers: Readonly<Record<string, RendererConfig>>;
    readonly components: Readonly<Record<string, ComponentConfig>>;
    /** Shared hook modules, relative to the app: they apply to every renderer, first. */
    readonly hooks?: readonly string[];
}

export const defineStories = (config: StoriesConfig): StoriesConfig => config;

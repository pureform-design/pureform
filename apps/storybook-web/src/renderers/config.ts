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
    /** A module of scenes, relative to the app, for the components whose case carries data, not
     *  props of the binding's export (`Toast`'s `toasts`, `GridList`'s `tiles`). It exports each
     *  component named in `components`, taking the case's props; the story draws that instead
     *  of the binding's export. */
    readonly scenes?: {
        readonly module: string;
        readonly components: readonly string[];
    };
    /** `false` where the cases' readers can't read the renderer's DOM (they read the web
     *  bindings' native elements, ARIA and data attributes): its stories run without the
     *  generated play tests. The a11y checks still run. */
    readonly casePlays?: boolean;
    /** `false` leaves the renderer out of the story tests (`vitest.config.storybook.ts`); its
     *  stories still draw in Storybook. */
    readonly tests?: boolean;
}

/** Overrides for one component; everything else comes from its anatomy and its case. */
export interface ComponentConfig {
    /** The stories' title, over the component's name, for one whose name differs from
     *  another's only in case (`Textarea`, `TextArea`): Storybook's ids ignore case. A `/` files
     *  it in a group; the generated file is named after it. */
    readonly title?: string;
    /** Args for every story of the component, over the case's props and the shared and
     *  renderer hooks'. */
    readonly args?: Args;
    /** Props to give no control, besides those the derivation drops
     *  (`scripts/prop-controls.ts`). */
    readonly controls?: { readonly exclude?: readonly string[] };
    /** Arg types over the derived ones. */
    readonly argTypes?: Partial<ArgTypes>;
    /** Scheme-pinned copies of `Default` (`Light`, `Dark`) with the state's play: they set the
     *  story's `globals.scheme`, which overrides (and locks) the toolbar's. Over the config's
     *  `schemes`. */
    readonly schemes?: readonly ("light" | "dark")[];
    /** The canvas's minimum height in pixels, over `overlayHeight` (which only overlays get). */
    readonly height?: number;
    /** Parameters for every story of the component (the meta's), plain data:
     *  `{ a11y: { test: "todo" } }`. */
    readonly parameters?: Readonly<Record<string, unknown>>;
    /** Globals for every story of the component (the meta's), plain data:
     *  `{ viewport: { value: "suites", isRotated: false } }`. */
    readonly globals?: Readonly<Record<string, unknown>>;
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
    /** The renderer whose component exports give the controls (their resolved props); the
     *  first renderer when left out. */
    readonly controls?: string;
    /** The components to draw, by export name; left out: every one with an anatomy and a case. */
    readonly include?: readonly string[];
    /** Components to leave out, each with the reason it can't be drawn from its case. */
    readonly skip?: Readonly<Record<string, string>>;
    /** Scheme-pinned copies every component gets, unless its own `schemes` says otherwise. */
    readonly schemes?: readonly ("light" | "dark")[];
    /** The canvas's minimum height, in pixels, for a component whose case opens an overlay
     *  (it has `overlay` or `opened`), so a floating or modal surface has room. */
    readonly overlayHeight?: number;
    /** Overrides by component. */
    readonly components?: Readonly<Record<string, ComponentConfig>>;
    /** Shared hook modules, relative to the app: they apply to every renderer, first. */
    readonly hooks?: readonly string[];
}

export const defineStories = (config: StoriesConfig): StoriesConfig => config;

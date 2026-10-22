// A story's `render` over every renderer: it mounts the toolbar's renderer into one element the
// story keeps, updates it in place when only the args or the theme change, and remounts when the
// renderer does. A renderer without the component shows so in the canvas.

import type { StoryContext } from "@storybook/html-vite";

import { rendererArgs, type RendererHooks } from "./hooks";
import type {
    Args,
    MountContext,
    MountHandle,
    RendererAdapter,
    StoryTheme,
} from "./types";

/** A renderer's adapter, its hook, and its component (`undefined` where it has none). */
export interface Impl {
    readonly adapter: RendererAdapter<any>;
    readonly hooks: RendererHooks;
    readonly component: unknown;
}

/** Each renderer's implementation, by the `renderer` global's value. */
export type Impls = Readonly<Record<string, Impl>>;

/** The args each level gave, which a renderer's own args sit between. */
export interface ArgLevels {
    readonly shared: Args;
    readonly component: Args;
}

let current:
    | { story: string; renderer: string; el: HTMLElement; handle: MountHandle }
    | undefined;

/** Counts mounts, so a test can tell an update from a remount. */
export const stats = { mounts: 0, updates: 0 };
(globalThis as { __sbStats?: typeof stats }).__sbStats = stats;

/** The `theme` global: `light`, `dark`, or a named theme from the config (in light). */
export const parseTheme = (value: unknown): StoryTheme =>
    value === "dark"
        ? { scheme: "dark" }
        : value === undefined || value === "light"
          ? { scheme: "light" }
          : { scheme: "light", name: String(value) };

export const multiRender =
    (impls: Impls, levels: ArgLevels) =>
    (args: Args, context: StoryContext): HTMLElement => {
        const renderer = String(context.globals["renderer"] ?? "solid");
        const impl = impls[renderer] ?? Object.values(impls)[0]!;
        const props = rendererArgs(
            impl.hooks,
            args,
            levels.shared,
            levels.component,
        );
        const mount: MountContext = {
            theme: parseTheme(context.globals["theme"]),
            globals: context.globals,
            decorators: impl.hooks.decorators ?? [],
        };
        if (current?.story === context.id && current.renderer === renderer) {
            current.handle.update(props, mount);
            stats.updates++;
            return current.el;
        }
        current?.handle.unmount();
        current = undefined;
        const el = document.createElement("div");
        el.dataset["renderer"] = renderer;
        if (impl.component === undefined) {
            el.textContent = `${context.title} isn't implemented in ${impl.adapter.title}.`;
            return el;
        }
        const handle = impl.adapter.mount(el, impl.component, props, mount);
        stats.mounts++;
        current = { story: context.id, renderer, el, handle };
        return el;
    };

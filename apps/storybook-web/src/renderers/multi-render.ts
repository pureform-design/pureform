// A story's `render` over every renderer: it mounts the toolbar's renderer into one element the
// story keeps, updates it in place when only the args change, and remounts when the renderer does.

import type { StoryContext } from "@storybook/html-vite";

import type { Args, MountHandle, RendererAdapter } from "./types";

/** Each renderer's adapter and component, by the `renderer` global's value. */
export type Impls = Record<
    string,
    { adapter: RendererAdapter<any>; component: unknown }
>;

let current:
    | { story: string; renderer: string; el: HTMLElement; handle: MountHandle }
    | undefined;

/** Counts mounts, so a test can tell an update from a remount. */
export const stats = { mounts: 0, updates: 0 };
(globalThis as { __sbStats?: typeof stats }).__sbStats = stats;

export const multiRender =
    (impls: Impls) =>
    (args: Args, context: StoryContext): HTMLElement => {
        const renderer = String(context.globals["renderer"] ?? "solid");
        if (current?.story === context.id && current.renderer === renderer) {
            current.handle.update(args);
            stats.updates++;
            return current.el;
        }
        current?.handle.unmount();
        const impl = impls[renderer] ?? Object.values(impls)[0]!;
        const el = document.createElement("div");
        el.dataset["renderer"] = renderer;
        const handle = impl.adapter.mount(el, impl.component, args);
        stats.mounts++;
        current = { story: context.id, renderer, el, handle };
        return el;
    };

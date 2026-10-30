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
    /** `false`: the case's play tests are skipped in this renderer. */
    readonly casePlays?: boolean;
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

/** The `scheme` global (`system`, `light`, `dark`) and the `theme` global (`default` or a named
 *  theme from the config). `system` forces nothing, so every renderer follows the OS. */
export const storyTheme = (
    globals: Readonly<Record<string, unknown>>,
): StoryTheme => {
    const scheme = globals["scheme"];
    const theme = globals["theme"];
    return {
        scheme: scheme === "light" || scheme === "dark" ? scheme : undefined,
        name:
            typeof theme === "string" && theme !== "default"
                ? theme
                : undefined,
    };
};

/** The args without those the story's example leaves out (`parameters.pureform.unset`, from
 *  an `as: undefined` over the component's `as: "button"`), unless a control changed them. */
export const withoutUnset = (
    args: Args,
    component: Args,
    parameters: Readonly<Record<string, unknown>> | undefined,
): Args => {
    const unset = (parameters?.["pureform"] as { unset?: readonly string[] })
        ?.unset;
    if (!unset?.length) return args;
    const out = { ...args };
    for (const key of unset) {
        if (out[key] === component[key]) delete out[key];
    }
    // Without its element or a link, nothing in the example acts, so the case's click spy has no
    // press to answer: where React Native takes it as `onPress`, it would ripple.
    if (unset.includes("as") && !("as" in out) && out["href"] === undefined)
        delete out["onClick"];
    return out;
};

export const multiRender =
    (impls: Impls, levels: ArgLevels) =>
    (args: Args, context: StoryContext): HTMLElement => {
        const renderer = String(context.globals["renderer"] ?? "solid");
        const impl = impls[renderer] ?? Object.values(impls)[0]!;
        const props = rendererArgs(
            impl.hooks,
            withoutUnset(args, levels.component, context.parameters),
            levels.shared,
            levels.component,
        );
        const mount: MountContext = {
            theme: storyTheme(context.globals),
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
            const absent = (
                context.parameters?.["pureform"] as
                    | { absent?: Readonly<Record<string, string>> }
                    | undefined
            )?.absent?.[renderer];
            el.textContent =
                absent ??
                `${context.title} isn't implemented in ${impl.adapter.title}.`;
            return el;
        }
        const handle = impl.adapter.mount(el, impl.component, props, mount);
        stats.mounts++;
        current = { story: context.id, renderer, el, handle };
        return el;
    };

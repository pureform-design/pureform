// The hook modules the stories compose, and the order they resolve in. A hook module exports any
// of `decorators`, `args`, `extendStory` and, read by the codegen only, `transformSource`.
// Later wins: the shared hook (`src/hooks.ts`), the renderer's (its binding's `storybook`
// export), then the component's (`stories.config.ts`).

import type { Decorator, StoryObj } from "@storybook/html-vite";

import type { Args, RendererDecorator } from "./types";

/** Which story `extendStory` is extending. */
export interface StoryName {
    readonly component: string;
    readonly story: string;
}

/** A story-level hook: the shared one, or a component's. */
export interface StoryHooks {
    /** Storybook decorators, around every renderer. */
    readonly decorators?: readonly Decorator[];
    /** Default args, merged into every story's. */
    readonly args?: Args;
    /** Edits a story: adds a `play` test, parameters or args. */
    readonly extendStory?: (name: StoryName, story: StoryObj) => StoryObj;
}

/** A renderer's hook, its binding's `storybook` export. */
export interface RendererHooks {
    /** Decorators in the renderer's own elements, inner first; the provider is one. */
    readonly decorators?: readonly RendererDecorator[];
    /** Default args while this renderer draws, or a function from the story's args to its props. */
    readonly args?: Args | ((args: Args) => Args);
    readonly extendStory?: (name: StoryName, story: StoryObj) => StoryObj;
}

/** The codegen's hook: edits a generated story file's source before it's written. */
export type TransformSource = (component: string, source: string) => string;

/** Runs each hook's `extendStory` over the story, in order. */
export const extendWith =
    (hooks: readonly (StoryHooks | RendererHooks)[]) =>
    (name: StoryName, story: StoryObj): StoryObj =>
        hooks.reduce(
            (acc, hook) => hook.extendStory?.(name, acc) ?? acc,
            story,
        );

/** A renderer's props from the story's args. Its object args sit between the shared args and
 *  the component's: they replace a shared default the controls haven't changed, and never a
 *  component's. */
export const rendererArgs = (
    hooks: RendererHooks,
    args: Args,
    shared: Args,
    component: Args,
): Args => {
    const own = hooks.args;
    if (typeof own === "function") return own(args);
    if (!own) return args;
    const out = { ...args };
    for (const [key, value] of Object.entries(own)) {
        if (key in component) continue;
        if (!(key in args) || args[key] === shared[key]) out[key] = value;
    }
    return out;
};

// What a generated story file calls: one component's meta and stories from its renderers and the
// hooks at each level (see `hooks.ts` for the order).

import type { ArgTypes, Decorator, StoryObj } from "@storybook/html-vite";

import { extendWith, type StoryHooks } from "./hooks";
import { type Impls, multiRender } from "./multi-render";
import type { Args } from "./types";

export interface ComposeInput {
    readonly component: string;
    readonly renderers: Impls;
    /** The shared hooks, in order. */
    readonly shared: readonly StoryHooks[];
    /** The component's hooks from `stories.config.ts`, in order. */
    readonly hooks: readonly StoryHooks[];
    /** The component's args and arg types from `stories.config.ts`. */
    readonly args: Args;
    readonly argTypes: Partial<ArgTypes>;
    /** Pins every story of the component to a scheme. */
    readonly scheme?: "light" | "dark" | undefined;
}

export const composeStories = (input: ComposeInput) => {
    const shared = Object.assign({}, ...input.shared.map((h) => h.args));
    const component = Object.assign(
        {},
        ...input.hooks.map((h) => h.args),
        input.args,
    );
    const decorators: Decorator[] = [...input.shared, ...input.hooks].flatMap(
        (h) => h.decorators ?? [],
    );
    const extend = extendWith([
        ...input.shared,
        ...Object.values(input.renderers).map((r) => r.hooks),
        ...input.hooks,
    ]);
    return {
        meta: {
            render: multiRender(input.renderers, { shared, component }),
            args: { ...shared, ...component },
            argTypes: input.argTypes,
            decorators,
            ...(input.scheme ? { globals: { scheme: input.scheme } } : {}),
        },
        /** A story; `base.globals.scheme` pins its scheme over the toolbar's. */
        story: (story: string, base: StoryObj = {}): StoryObj => {
            const scheme = base.globals?.["scheme"];
            return extend(
                {
                    component: input.component,
                    story,
                    scheme:
                        scheme === "light" || scheme === "dark"
                            ? scheme
                            : undefined,
                },
                base,
            );
        },
    };
};

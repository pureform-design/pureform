// What a generated story file calls: one component's meta and stories from its case, its
// renderers, and the hooks at each level (see `hooks.ts` for the order).

import type { ArgTypes, Decorator, StoryObj } from "@storybook/html-vite";
import { fn } from "storybook/test";

import { extendWith, type StoryHooks } from "./hooks";
import { type Impls, multiRender } from "./multi-render";
import { caseFor, defaultProp, keyPlay, statePlay } from "./plays";
import type { Args } from "./types";

/** The play test a story gets from the case: the state's, or the key's at that index. */
export type PlayKind = "state" | { readonly key: number };

export interface ComposeInput {
    /** The component's export name, which names its case (`Switch`). */
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
    /** The canvas's minimum height in pixels (an overlay's room), `parameters.pureform.height`. */
    readonly height?: number | undefined;
    /** The component's parameters from `stories.config.ts`. */
    readonly parameters?: Readonly<Record<string, unknown>> | undefined;
}

export const composeStories = (input: ComposeInput) => {
    const shared = Object.assign({}, ...input.shared.map((h) => h.args));
    const c = caseFor(input.component);
    // The case's props (an accessible name), and a spy for a key that clicks.
    const component = Object.assign(
        {},
        c.props,
        c.keyboard?.keys.some((key) => key.does === "click")
            ? {
                  // A link's click would navigate the story's frame away (a list's
                  // `href="#inbox"`), so the spy keeps it in place.
                  onClick: fn((event?: { preventDefault?: () => void }) =>
                      event?.preventDefault?.(),
                  ),
              }
            : {},
        ...input.hooks.map((h) => h.args),
        input.args,
    );
    // Renderers whose DOM the cases can't read (see `RendererConfig.casePlays`).
    const without = new Set(
        Object.entries(input.renderers)
            .filter(([, impl]) => impl.casePlays === false)
            .map(([name]) => name),
    );
    const skipping =
        (play: NonNullable<StoryObj["play"]>): NonNullable<StoryObj["play"]> =>
        (context) =>
            without.has(String(context.globals["renderer"]))
                ? undefined
                : play(context);
    /** A story with the case's play. A play that reads the state starts it at `from`,
     *  uncontrolled; a key that clicks leaves the state alone (a button stays a plain button). */
    const withPlay = (base: StoryObj, play: PlayKind | undefined): StoryObj => {
        if (play === undefined) return base;
        const key =
            typeof play === "object" ? c.keyboard?.keys[play.key] : undefined;
        const reads = c.state && key?.does !== "click";
        // A `null` the key's props give means "left out" (Storybook drops null args).
        const args = Object.fromEntries(
            Object.entries({
                ...(reads
                    ? {
                          ...c.state!.props,
                          [defaultProp(c.state!.prop)]: c.state!.from,
                      }
                    : {}),
                ...key?.props,
                ...base.args,
            }).filter(([, value]) => value !== null),
        );
        return {
            ...base,
            args,
            play: skipping(key ? keyPlay(c, key) : statePlay(c)),
        };
    };
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
            parameters: {
                ...input.parameters,
                ...(input.height
                    ? {
                          pureform: {
                              ...(input.parameters?.["pureform"] as
                                  | object
                                  | undefined),
                              height: input.height,
                          },
                      }
                    : {}),
            },
            ...(input.scheme ? { globals: { scheme: input.scheme } } : {}),
        },
        /** A story; `base.globals.scheme` pins its scheme over the toolbar's, and `play` gives
         *  it a play test from the case. */
        story: (
            story: string,
            base: StoryObj = {},
            play?: PlayKind,
        ): StoryObj => {
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
                withPlay(base, play),
            );
        },
    };
};

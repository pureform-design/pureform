// `@pureform/solid/storybook`: what a Storybook needs to render Solid's components, as a hook
// module `apps/storybook-web` reads (see its README): decorators that wrap every story in Solid,
// starting with the provider. No JSX, so a type check with another renderer's JSX can read it.

import type { AnyRegistry } from "@pureform/binding-core";
import type { JSX } from "@solidjs/web";
import { createComponent } from "solid-js";

import { PureformProvider } from "../provider";

/** The story's theme from the toolbar: the scheme (`undefined` follows the system), and a named
 *  theme from the config. */
export interface StoryTheme {
    readonly scheme?: "light" | "dark" | undefined;
    readonly name?: string | undefined;
}

/** What a decorator reads. Its fields are reactive: read them where they're used. */
export interface StoryContext {
    readonly registry: AnyRegistry;
    readonly theme: StoryTheme;
    readonly globals: Readonly<Record<string, unknown>>;
}

/** Wraps the story, inner decorators first. */
export type Decorator = (
    story: () => JSX.Element,
    context: StoryContext,
) => JSX.Element;

/** The provider with the story's registry and named theme. The scheme is the page's class,
 *  which the Panda target's dark condition reads (no class follows the system). */
const withProvider: Decorator = (story, context) =>
    createComponent(PureformProvider, {
        get registry() {
            return context.registry;
        },
        get theme() {
            return context.theme.name;
        },
        get children() {
            return story();
        },
    });

export const decorators: readonly Decorator[] = [withProvider];

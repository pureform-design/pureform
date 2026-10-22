"use client";

// `@pureform/react/storybook`: what a Storybook needs to render React's components, as a hook
// module `apps/storybook-web` reads (see its README): decorators that wrap every story in React,
// starting with the provider. No JSX, so a type check with another renderer's JSX can read it.

import type { AnyRegistry } from "@pureform/binding-core";
import { createElement } from "react";
import type { ReactNode } from "react";

import { PureformProvider } from "../provider";

/** The story's theme from the toolbar: the scheme, and a named theme from the config. */
export interface StoryTheme {
    readonly scheme: "light" | "dark";
    readonly name?: string | undefined;
}

export interface StoryContext {
    readonly registry: AnyRegistry;
    readonly theme: StoryTheme;
    readonly globals: Readonly<Record<string, unknown>>;
}

/** Wraps the story, inner decorators first. */
export type Decorator = (
    story: () => ReactNode,
    context: StoryContext,
) => ReactNode;

/** The provider with the story's registry and named theme. The scheme is the page's class,
 *  which the Panda target's dark condition reads. */
const withProvider: Decorator = (story, context) =>
    createElement(
        PureformProvider,
        { registry: context.registry, theme: context.theme.name },
        story(),
    );

export const decorators: readonly Decorator[] = [withProvider];

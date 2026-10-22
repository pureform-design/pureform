// No JSX, like the Solid adapter: the stories import it. React Native Web renders through
// React's DOM too, so its adapter is this one over another registry.

import type { AnyRegistry } from "@pureform/binding-core";
import { createElement } from "react";
import type { ComponentType, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { registry } from "../../.pureform";
import type { Args, MountContext, RendererAdapter } from "../renderers/types";

/** An adapter that renders with React's DOM: the component under the hook's decorators, the
 *  provider first. */
export const reactDomAdapter = (
    name: string,
    title: string,
    registry: AnyRegistry,
): RendererAdapter<ComponentType<any>> => ({
    name,
    title,
    mount(el, Comp, args, context) {
        const root = createRoot(el);
        const draw = (
            props: Args,
            { theme, globals, decorators }: MountContext,
        ) => {
            const ctx = { registry, theme, globals };
            root.render(
                decorators.reduce<() => ReactNode>(
                    (story, decorate) => () => decorate(story, ctx),
                    () => createElement(Comp, props),
                )(),
            );
        };
        draw(args, context);
        return { update: draw, unmount: () => root.unmount() };
    },
});

export const reactAdapter = reactDomAdapter("react", "React", registry);

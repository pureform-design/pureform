// No JSX here: the stories import this file, and a type check from the app's root config (React's
// JSX) would read Solid's JSX with React's types. The provider comes from the binding's
// `storybook` hook, as a decorator.

import { render } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { createComponent, createStore, reconcile } from "solid-js";
import type { Component } from "solid-js";

import { registry } from "../../.pureform";
import type { Args, MountContext, RendererAdapter } from "../renderers/types";

export const solidAdapter: RendererAdapter<Component<any>> = {
    name: "solid",
    title: "Solid",
    mount(el, Comp, args, context) {
        const [props, setProps] = createStore<Args>({ ...args });
        // Reactive, so a theme change reaches the provider without a remount.
        const [ctx, setCtx] = createStore({
            registry,
            theme: { ...context.theme },
            globals: { ...context.globals },
        });
        const dispose = render(
            () =>
                context.decorators.reduce<() => JSX.Element>(
                    (story, decorate) => () => decorate(story, ctx),
                    () => createComponent(Comp, props),
                )(),
            el,
        );
        return {
            update: (next: Args, nextContext: MountContext) => {
                setProps(reconcile({ ...next }, "id"));
                setCtx((draft) => {
                    draft.theme = { ...nextContext.theme };
                    draft.globals = { ...nextContext.globals };
                });
            },
            unmount: dispose,
        };
    },
};

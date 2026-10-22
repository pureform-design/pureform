// No JSX here: the stories import this file, and a type check from the app's root config (React's
// JSX) would read Solid's JSX with React's types. The provider comes from the binding's
// `storybook` hook, as a decorator.

import { render } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { createComponent, createSignal, createStore } from "solid-js";
import type { Component } from "solid-js";

import { registry } from "../../.pureform";
import type { Args, MountContext, RendererAdapter } from "../renderers/types";

export const solidAdapter: RendererAdapter<Component<any>> = {
    name: "solid",
    title: "Solid",
    mount(el, Comp, args, context) {
        // The args in a signal behind getters, not a store: a store hands out its arrays and
        // objects as proxies, which a machine keeping a default (a chip set's `["vegan"]`) then
        // reads through, so its own changes never show.
        const [current, setCurrent] = createSignal<Args>({ ...args });
        const props = new Proxy({} as Args, {
            get: (_, key) => current()[key as string],
            has: (_, key) => key in current(),
            ownKeys: () => Reflect.ownKeys(current()),
            getOwnPropertyDescriptor: (_, key) =>
                key in current()
                    ? {
                          configurable: true,
                          enumerable: true,
                          get: () => current()[key as string],
                      }
                    : undefined,
        });
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
                setCurrent({ ...next });
                setCtx((draft) => {
                    draft.theme = { ...nextContext.theme };
                    draft.globals = { ...nextContext.globals };
                });
            },
            unmount: dispose,
        };
    },
};

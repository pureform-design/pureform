// No JSX here: the stories import this file, and a type check from the app's root config (React's
// JSX) would read Solid's JSX with React's types. The provider comes from the binding's
// `storybook` hook, as a decorator.

import { render } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import { createComponent, createSignal, createStore, untrack } from "solid-js";
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
        // Which keys the props have is read where Solid's `omit` and `mergeProps` ask in a
        // component's body, outside tracking, and can't follow a change. So it's a snapshot, and
        // a change in the set of keys remounts; the values behind the getters stay reactive.
        const keysOf = (value: Args) => Reflect.ownKeys(value).join("\0");
        let keys = keysOf(args);
        const snapshot = () => untrack(current);
        const props = new Proxy({} as Args, {
            get: (_, key) => current()[key as string],
            has: (_, key) => key in snapshot(),
            ownKeys: () => Reflect.ownKeys(snapshot()),
            getOwnPropertyDescriptor: (_, key) =>
                key in snapshot()
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
        const draw = () =>
            render(
                () =>
                    context.decorators.reduce<() => JSX.Element>(
                        (story, decorate) => () => decorate(story, ctx),
                        () => createComponent(Comp, props),
                    )(),
                el,
            );
        let dispose = draw();
        return {
            update: (next: Args, nextContext: MountContext) => {
                setCurrent({ ...next });
                // Leaves, not fresh objects: only what changed notifies its readers.
                setCtx((draft) => {
                    assignLeaves(draft.theme, nextContext.theme);
                    assignLeaves(draft.globals, nextContext.globals);
                });
                const nextKeys = keysOf(next);
                if (nextKeys !== keys) {
                    keys = nextKeys;
                    dispose();
                    dispose = draw();
                }
            },
            unmount: () => dispose(),
        };
    },
};

/** Writes `source`'s entries onto `target` where they differ, and drops the keys it no longer has. */
export function assignLeaves(target: object, source: object): void {
    const into = target as Record<string, unknown>;
    for (const key of Object.keys(into)) {
        if (!(key in source)) delete into[key];
    }
    for (const [key, value] of Object.entries(source)) {
        if (into[key] !== value) into[key] = value;
    }
}

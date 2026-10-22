// No JSX here: the stories import this file, and a type check from the app's root config (React's
// JSX) would read Solid's JSX with React's types. Solid's JSX lives in its own project
// (`src/solid/tsconfig.json`) for decorators and hooks that need it.

import { PureformProvider } from "@pureform/solid";
import { render } from "@solidjs/web";
import { createComponent, createStore, reconcile } from "solid-js";
import type { Component } from "solid-js";

import { registry } from "../../.pureform";
import type { Args, RendererAdapter } from "../renderers/types";

export const solidAdapter: RendererAdapter<Component<any>> = {
    name: "solid",
    title: "Solid",
    mount(el, Comp, args) {
        const [props, setProps] = createStore<Args>({ ...args });
        const dispose = render(
            () =>
                createComponent(PureformProvider, {
                    registry,
                    get children() {
                        return createComponent(Comp, props);
                    },
                }),
            el,
        );
        return {
            update: (next) => setProps(reconcile({ ...next }, "id")),
            unmount: dispose,
        };
    },
};

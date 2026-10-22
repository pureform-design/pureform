import { PureformProvider } from "@pureform/react-native";
import { nativeFactory } from "@pureform/rn-adapter/factory";
import { createRegistry } from "@pureform/styling";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { runtime, runtimeTokens } from "virtual:pureform-rn";

import type { Args, RendererAdapter } from "../renderers/types";

// Every component a factory over styles resolved at run time (see `.storybook/main.ts`).
const registry = createRegistry(
    Object.fromEntries(
        Object.entries(runtimeTokens).map(([name, tokens]) => [
            name,
            nativeFactory(name, runtime, tokens),
        ]),
    ),
);

export const nativeAdapter: RendererAdapter<ComponentType<any>> = {
    name: "native",
    title: "React Native",
    mount(el, Comp, args) {
        const root = createRoot(el);
        const draw = (props: Args) =>
            root.render(
                <PureformProvider registry={registry} scheme="light">
                    <Comp {...props} />
                </PureformProvider>,
            );
        draw(args);
        return { update: draw, unmount: () => root.unmount() };
    },
};

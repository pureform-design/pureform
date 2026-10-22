import { PureformProvider } from "@pureform/react";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";

import { registry } from "../../.pureform";
import type { Args, RendererAdapter } from "../renderers/types";

export const reactAdapter: RendererAdapter<ComponentType<any>> = {
    name: "react",
    title: "React",
    mount(el, Comp, args) {
        const root = createRoot(el);
        const draw = (props: Args) =>
            root.render(
                <PureformProvider registry={registry}>
                    <Comp {...props} />
                </PureformProvider>,
            );
        draw(args);
        return { update: draw, unmount: () => root.unmount() };
    },
};

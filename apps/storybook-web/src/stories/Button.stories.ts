import { Button as NativeButton } from "@pureform/react-native/button";
import { Button as ReactButton } from "@pureform/react/button";
import { Button as SolidButton } from "@pureform/solid/button";
import type { Meta, StoryObj } from "@storybook/html-vite";

import { nativeAdapter } from "../native/adapter";
import { reactAdapter } from "../react/adapter";
import { multiRender } from "../renderers/multi-render";
import { solidAdapter } from "../solid/adapter";

export default {
    title: "Button",
    render: multiRender({
        solid: { adapter: solidAdapter, component: SolidButton },
        react: { adapter: reactAdapter, component: ReactButton },
        native: { adapter: nativeAdapter, component: NativeButton },
    }),
    args: { label: "Save", variant: "filled", disabled: false },
    argTypes: {
        variant: {
            control: "inline-radio",
            options: ["filled", "tonal", "elevated", "outlined", "text"],
        },
    },
} satisfies Meta;

export const Default: StoryObj = {};

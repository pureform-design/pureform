import type { Preview } from "@storybook/html-vite";

import "../src/index.css";

export default {
    globalTypes: {
        renderer: {
            description: "The binding the story renders with",
            toolbar: {
                title: "Renderer",
                icon: "component",
                items: [
                    { value: "solid", title: "Solid" },
                    { value: "react", title: "React" },
                    { value: "native", title: "React Native" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { renderer: "solid" },
} satisfies Preview;

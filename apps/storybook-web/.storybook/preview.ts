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
        // Each renderer's hook maps it to its provider: Solid and React take the named theme
        // (the scheme is the page's class), React Native the scheme and the named theme.
        theme: {
            description: "The theme the story renders with",
            toolbar: {
                title: "Theme",
                icon: "paintbrush",
                items: [
                    { value: "light", title: "Light" },
                    { value: "dark", title: "Dark" },
                    // The named themes in `pureform.config.ts`, in light.
                    { value: "teal", title: "Teal" },
                    { value: "squircle", title: "Squircle" },
                    { value: "sharp", title: "Sharp" },
                    { value: "compact", title: "Compact" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { renderer: "solid", theme: "light" },
} satisfies Preview;

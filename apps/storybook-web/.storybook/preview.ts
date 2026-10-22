import type { Preview } from "@storybook/html-vite";

import { systemTheme } from "./system-theme";

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
        // `system` forces nothing: the web's CSS follows `prefers-color-scheme` and React
        // Native's provider `useColorScheme()`, live. Light and dark set the page's class (web)
        // or the provider's `scheme` (React Native).
        scheme: {
            description: "The color scheme the story renders with",
            toolbar: {
                title: "Scheme",
                icon: "contrast",
                items: [
                    { value: "system", title: "System" },
                    { value: "light", title: "Light" },
                    { value: "dark", title: "Dark" },
                ],
                dynamicTitle: true,
            },
        },
        // Each renderer's hook maps it to its provider's `theme`.
        theme: {
            description: "The theme the story renders with",
            toolbar: {
                title: "Theme",
                icon: "paintbrush",
                items: [
                    { value: "default", title: "Default" },
                    // The named themes in `pureform.config.ts`.
                    { value: "teal", title: "Teal" },
                    { value: "squircle", title: "Squircle" },
                    { value: "sharp", title: "Sharp" },
                    { value: "compact", title: "Compact" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { renderer: "solid", scheme: "system", theme: "default" },
    // The a11y addon's violations fail the story's test (in Vitest and in the panel's runs).
    parameters: {
        a11y: { test: "error" },
        // The canvas is the theme's surface (`index.css`), not a backgrounds swatch.
        backgrounds: { disable: true },
        // Docs pages follow the system as the manager does (read once, when the page loads).
        docs: { theme: systemTheme() },
    },
} satisfies Preview;

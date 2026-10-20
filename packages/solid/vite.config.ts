import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        // JSX stays as written: an app's Solid plugin compiles it for the DOM or the server.
        oxc: false,
        build: {
            rolldownOptions: {
                transform: { jsx: "preserve" },
                // Shared chunks hold JSX too, so they're `.jsx` like the entries: an app's Solid
                // plugin only reads JSX in files named so.
                output: { chunkFileNames: "[name]-[hash].jsx" },
            },
            // Renaming would turn a component (`<Tag>`) into a lowercase tag the Solid plugin
            // reads as an element.
            minify: false,
            lib: {
                entry: {
                    index: "src/index.ts",
                    button: "src/button/index.ts",
                    checkbox: "src/checkbox/index.ts",
                    chip: "src/chip/index.ts",
                    fab: "src/fab/index.ts",
                    "icon-button": "src/icon-button/index.ts",
                    "radio-group": "src/radio-group/index.ts",
                    select: "src/select/index.ts",
                    menu: "src/menu/index.ts",
                    dialog: "src/dialog/index.ts",
                    tooltip: "src/tooltip/index.ts",
                    snackbar: "src/snackbar/index.ts",
                    tabs: "src/tabs/index.ts",
                    "navigation-bar": "src/navigation-bar/index.ts",
                    "navigation-rail": "src/navigation-rail/index.ts",
                    list: "src/list/index.ts",
                    "list-item": "src/list-item/index.ts",
                    switch: "src/switch/index.ts",
                    "text-area": "src/text-area/index.ts",
                    "text-field": "src/text-field/index.ts",
                    avatar: "src/avatar/index.ts",
                    badge: "src/badge/index.ts",
                    card: "src/card/index.ts",
                    "circular-progress": "src/circular-progress/index.ts",
                    icon: "src/icon/index.ts",
                    "linear-progress": "src/linear-progress/index.ts",
                    media: "src/media/index.ts",
                    ripple: "src/ripple/index.ts",
                    scrim: "src/scrim/index.ts",
                    "search-bar": "src/search-bar/index.ts",
                    separator: "src/separator/index.ts",
                    slider: "src/slider/index.ts",
                    "supporting-text": "src/supporting-text/index.ts",
                    text: "src/text/index.ts",
                    "touch-target": "src/touch-target/index.ts",
                    "internal/zag": "src/internal/zag/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "solid"}.${format === "cjs" ? "cjs" : "jsx"}`,
                name: "Solid",
            },
        },
    },
});

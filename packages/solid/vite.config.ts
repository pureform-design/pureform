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
                    switch: "src/switch/index.ts",
                    "text-area": "src/text-area/index.ts",
                    "text-field": "src/text-field/index.ts",
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

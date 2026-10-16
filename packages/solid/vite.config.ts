import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        // JSX stays as written: an app's Solid plugin compiles it for the DOM or the server.
        oxc: false,
        build: {
            rolldownOptions: { transform: { jsx: "preserve" } },
            // Renaming would turn a component (`<Tag>`) into a lowercase tag the Solid plugin
            // reads as an element.
            minify: false,
            lib: {
                entry: {
                    index: "src/index.ts",
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

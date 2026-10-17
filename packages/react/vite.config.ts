import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            rolldownOptions: {
                // Every entry starts with "use client", which the bundle keeps at its top: every
                // export is a hook or a component that renders on the client.
                onLog(level, log, handler) {
                    if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
                    handler(level, log);
                },
            },
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
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "react"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "React",
            },
        },
    },
});

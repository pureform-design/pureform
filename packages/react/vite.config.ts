import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            rolldownOptions: {
                // The one entry starts with "use client", which the bundle keeps at its top: every
                // export is a hook or a component that renders on the client.
                onLog(level, log, handler) {
                    if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
                    handler(level, log);
                },
            },
            lib: {
                entry: {
                    index: "src/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "react"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "React",
            },
        },
    },
});

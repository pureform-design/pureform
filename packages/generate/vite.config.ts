import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json" with { type: "json" };

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "generate"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Generate",
            },
        },
    },
});

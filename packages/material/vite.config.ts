import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json" with { type: "json" };

export default createConfig({
    package: packageJson,
    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    "runtime-theme": "src/runtime-theme/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "material"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "UiUtils",
            },
        },
    },
});

import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    "internal/zag": "src/internal/zag/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "solid"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Solid",
            },
        },
    },
});

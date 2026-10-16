import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    derive: "src/derive.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "anatomy"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Anatomy",
            },
        },
    },
});

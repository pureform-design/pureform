import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    "theme-vars": "src/theme-vars.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "styling"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Styling",
            },
        },
    },
});

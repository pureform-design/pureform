import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json" with { type: "json" };

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    indication: "src/indication.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "binding-dom"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "BindingDom",
            },
        },
    },
});

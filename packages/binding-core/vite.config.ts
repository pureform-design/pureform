import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    dom: "src/dom.ts",
                    usage: "src/usage.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "binding-core"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "BindingCore",
            },
        },
    },
});

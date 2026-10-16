import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    runtime: "src/runtime.ts",
                    build: "src/build.ts",
                    vite: "src/vite.ts",
                    codegen: "src/codegen.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "css-adapter"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "CssAdapter",
            },
        },
    },
});

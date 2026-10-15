import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,
    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    core: "src/core.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "js-effects"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "JsEffects",
            },
        },
    },
});

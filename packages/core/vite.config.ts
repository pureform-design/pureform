import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    ast: "src/ast/index.ts",
                    "ast/helpers": "src/ast/helpers/index.ts",
                    "ast/helpers/keyword": "src/ast/helpers/keyword/index.ts",
                    types: "src/types.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "core"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Core",
            },
        },
    },
});

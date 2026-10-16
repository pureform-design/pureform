import { createConfig } from "@pureform/vite-config/script";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    generateTypes: true,
    externalizeDeps: true,

    overrides: {
        build: {
            lib: {
                entry: {
                    pureform: "src/cli/index.ts",

                    index: "src/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "cli"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Cli",
            },
        },
    },
});

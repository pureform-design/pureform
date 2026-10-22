import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json" with { type: "json" };

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    vite: "src/vite.ts",
                    rollup: "src/rollup.ts",
                    rolldown: "src/rolldown.ts",
                    esbuild: "src/esbuild.ts",
                    metro: "src/metro.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "bundler"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Bundler",
            },
        },
    },
});

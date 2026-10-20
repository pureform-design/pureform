import { chmod } from "node:fs/promises";
import { join } from "node:path";

import { createConfig } from "@pureform/vite-config/script";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    generateTypes: true,
    externalizeDeps: true,

    overrides: {
        plugins: [
            // The bin is written without its exec bit, and `bun x pureform` then runs npm's
            // unrelated `pureform` package instead.
            {
                name: "pureform-bin-executable",
                async writeBundle(options) {
                    await chmod(join(options.dir!, "pureform.mjs"), 0o755);
                },
            },
        ],
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

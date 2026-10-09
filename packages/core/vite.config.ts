import { readdirSync } from "node:fs";

import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

// Emit one bundle per public entry. The `./ast/helpers/*` subpath export is a wildcard, so
// every helper module (including the `keyword` submodule) needs its own dist file for the
// wildcard to resolve to real JS in built consumers, not only to src under the `development`
// condition. Derive those entries from the source tree so adding a helper needs no edit here.
const helperEntries = (dir: string, prefix: string): Record<string, string> => {
    const entries: Record<string, string> = {};
    for (const file of readdirSync(dir)) {
        if (!file.endsWith(".ts") || file === "index.ts") continue;
        const name = file.slice(0, -".ts".length);
        entries[`${prefix}/${name}`] = `${dir}/${file}`;
    }
    return entries;
};

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
                    ...helperEntries("src/ast/helpers", "ast/helpers"),
                    ...helperEntries(
                        "src/ast/helpers/keyword",
                        "ast/helpers/keyword",
                    ),
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "core"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Core",
            },
        },
    },
});

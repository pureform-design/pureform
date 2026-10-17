import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    codegen: "src/codegen.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "tailwind-adapter"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "TailwindAdapter",
            },
        },
    },
});

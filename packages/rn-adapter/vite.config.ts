import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    react: "src/react.ts",
                    animated: "src/animated.ts",
                    svg: "src/svg.ts",
                    reanimated: "src/reanimated.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "rn-adapter"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "RnAdapter",
            },
        },
    },
});

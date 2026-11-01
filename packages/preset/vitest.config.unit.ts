import unitTestConfig from "@pureform/vitest-config/unit";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    test: {
        // Some specs build the whole preset (100–200 ms alone), which exceeds 1 s under load.
        testTimeout: 5000,
        // Its 140 files each import the preset's modules: shared across a worker's files, they
        // load once (25 s to 12 s). The specs keep no state between them.
        isolate: false,
        include: ["./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
    },
} satisfies UserWorkspaceConfig);

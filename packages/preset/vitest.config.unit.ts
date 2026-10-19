import unitTestConfig from "@pureform/vitest-config/unit";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    test: {
        // Some specs build the whole preset (100–200 ms alone), which exceeds 1 s under load.
        testTimeout: 5000,
        include: ["./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
    },
} satisfies UserWorkspaceConfig);

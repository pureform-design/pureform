import unitTestConfig from "@pureform/vitest-config/unit";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    test: {
        testTimeout: 5000,
        environment: "jsdom",
        include: ["./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
    },
} satisfies UserWorkspaceConfig);

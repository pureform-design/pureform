import integrationTestConfig from "@pureform/vitest-config/integration";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config";

// Builds that run real tools, such as Metro bundling a fixture app.
export default mergeConfig(mergeConfig(baseConfig, integrationTestConfig), {
    test: {
        testTimeout: 120_000,
        include: ["./test/**/*.test.ts"],
    },
} satisfies UserWorkspaceConfig);

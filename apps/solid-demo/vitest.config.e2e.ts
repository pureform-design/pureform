// The smoke test, in Node: a global setup starts the demo's own dev server, and the test opens the
// home page in Chromium through Playwright. Set CHROMIUM_PATH to use a system Chromium instead of
// Playwright's download.

import e2eTestConfig from "@pureform/vitest-config/e2e";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

export default mergeConfig(e2eTestConfig, {
    test: {
        environment: "node",
        globalSetup: ["./vitest-e2e-server.ts"],
        testTimeout: 60_000,
    },
} satisfies UserWorkspaceConfig);

// The smoke test, in Node: a global setup starts the demo's own dev server and compiles the pages
// the test visits, and the test opens them in Chromium through Playwright. Set CHROMIUM_PATH to
// use a system Chromium instead of Playwright's download.

import e2eTestConfig from "@pureform/vitest-config/e2e";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

export default mergeConfig(e2eTestConfig, {
    test: {
        environment: "node",
        globalSetup: ["./vitest-e2e-server.ts"],
        // Off: with it, Vitest's main process (5.0.5) loads the global setup's transformed code as
        // bytes, not a string, and the source-map lookup its `Error.prepareStackTrace` hook does
        // for a stack with a frame in the setup throws (`code.charCodeAt is not a function`). Every
        // stack captured while the setup runs (jiti loading `pureform.config.ts`, Playwright's API
        // calls) has one, so the setup failed. The test workers read the cache as text and aren't
        // affected; one setup and one test file lose little without it.
        fsModuleCache: false,
        testTimeout: 60_000,
        // Launching Chromium, on a loaded machine.
        hookTimeout: 60_000,
        // The transactions page renders its rows a short task at a time, which a loaded machine
        // stretches past the default second.
        expect: { poll: { timeout: 15_000 } },
    },
} satisfies UserWorkspaceConfig);

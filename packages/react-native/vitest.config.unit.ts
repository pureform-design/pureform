// The unit tests: the native defaults, the stories' args, the source's imports, and the type-level
// specs, in the shared test environment (`vitest.config.shared.ts`). The components' specs are the
// component tests (`vitest.config.component.ts`).

import unitTestConfig from "@pureform/vitest-config/unit";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";
import shared from "./vitest.config.shared.ts";

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    ...shared,
    test: {
        ...shared.test,
        // The unit config doesn't run in a browser by itself, as the component config does.
        browser: {
            ...shared.test.browser,
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
        },
    },
});

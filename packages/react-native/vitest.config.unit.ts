// The unit tests: the native defaults, the stories' args, the source's imports, and the type-level
// specs, in the browser test environment (`vitest.config.browser.ts`). The components' specs are
// the component tests (`vitest.config.component.ts`).

import unitTestConfig from "@pureform/vitest-config/unit";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";
import browser from "./vitest.config.browser.ts";

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), browser);

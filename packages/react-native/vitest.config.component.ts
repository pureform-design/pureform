// Component tests: the components rendered in Chromium through React Native Web, in the shared
// test environment (`vitest.config.shared.ts`).

import componentTestConfig from "@pureform/vitest-config/component";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";
import shared from "./vitest.config.shared.ts";

export default mergeConfig(
    mergeConfig(baseConfig, componentTestConfig),
    shared,
);

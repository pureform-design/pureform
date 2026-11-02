// Component tests: the components rendered in Chromium through React Native Web, in the browser
// test environment (`vitest.config.browser.ts`).

import componentTestConfig from "@pureform/vitest-config/component";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";
import browser from "./vitest.config.browser.ts";

export default mergeConfig(
    mergeConfig(baseConfig, componentTestConfig),
    browser,
);

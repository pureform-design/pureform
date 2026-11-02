// The component suites: the components rendered in Chromium, once per binding and web target (see
// `vitest.config.browser.ts`).

import componentTestConfig from "@pureform/vitest-config/component";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";
import browser from "./vitest.config.browser.ts";

export default mergeConfig(
    mergeConfig(baseConfig, componentTestConfig),
    browser,
);

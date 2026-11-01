import { mergeConfig } from "vitest/config";
import baseConfig from "./vite.config.ts";
import browser from "./vitest.config.browser.ts";
import componentTestConfig from "@{{ vars.scope_name }}/vitest-config/component";

export default mergeConfig(
    mergeConfig(baseConfig, componentTestConfig),
    browser,
);

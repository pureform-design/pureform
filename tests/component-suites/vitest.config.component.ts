// The component suites: the components rendered in Chromium, once per binding and web target (see
// `vitest.config.shared.ts`).

import componentTestConfig from "@pureform/vitest-config/component";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";
import shared from "./vitest.config.shared.ts";

export default mergeConfig(
    mergeConfig(baseConfig, componentTestConfig),
    shared,
);

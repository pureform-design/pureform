// The component suites: the components rendered in Chromium, once per binding and web target (see
// `vitest.config.browser.ts`).

import { availableParallelism } from "node:os";

import componentTestConfig from "@pureform/vitest-config/component";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";
import browser from "./vitest.config.browser.ts";

export default mergeConfig(
    mergeConfig(mergeConfig(baseConfig, componentTestConfig), browser),
    {
        test: {
            // Most of a suite is waiting (on animations, on a real mouse), so the CPU idles: Vitest
            // splits its default worker count across the six projects, and twice the cores keeps
            // them busy (measured: 233 s to 130 s on six cores).
            maxWorkers: availableParallelism() * 2,
        },
    },
);

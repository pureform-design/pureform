// Unit tests in Chromium through Vitest's browser mode, as the web bindings run. Set
// CHROMIUM_PATH to use a system Chromium instead of Playwright's download.

import unitTestConfig from "@pureform/vitest-config/unit";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    test: {
        testTimeout: 5000,
        include: ["./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        browser: {
            enabled: true,
            headless: true,
            provider: playwright({
                launchOptions: executablePath ? { executablePath } : {},
                // Not UTC, so a date computed in UTC instead of locally shows up (the date pickers' "today").
                contextOptions: { timezoneId: "Asia/Manila" },
            }),
            instances: [{ browser: "chromium" }],
        },
    },
} satisfies UserWorkspaceConfig);

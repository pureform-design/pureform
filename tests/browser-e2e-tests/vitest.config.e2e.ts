// Browser tests in Chromium through Vitest's browser mode. Set CHROMIUM_PATH to use a system
// Chromium instead of Playwright's download.

import e2eTestConfig from "@pureform/vitest-config/e2e";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import { commands } from "./src/commands";
import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

export default mergeConfig(mergeConfig(baseConfig, e2eTestConfig), {
    test: {
        include: ["./src/**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        testTimeout: 60_000,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright({
                launchOptions: executablePath ? { executablePath } : {},
                contextOptions: { reducedMotion: "reduce" },
            }),
            instances: [
                { browser: "chromium", viewport: { width: 1280, height: 900 } },
            ],
            commands,
            expect: {
                toMatchScreenshot: {
                    comparatorName: "pixelmatch",
                    comparatorOptions: { allowedMismatchedPixelRatio: 0.002 },
                },
            },
        },
    },
} satisfies UserWorkspaceConfig);

// Unit tests in Chromium through Vitest's browser mode, since the port drives real DOM events.
// Set CHROMIUM_PATH to use a system Chromium instead of Playwright's download.

import unitTestConfig from "@pureform/vitest-config/unit";
import solid from "@solidjs/vite-plugin";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import { commands } from "./src/testing/commands";
import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    plugins: [solid()],
    // The library build leaves JSX to the app; the tests compile it, and TypeScript, here.
    oxc: {},
    // Optimized up front, so Vite doesn't reload a test when it finds them.
    optimizeDeps: {
        include: [
            "@zag-js/checkbox",
            "@zag-js/radio-group",
            "@zag-js/select",
            "@zag-js/switch",
        ],
    },
    resolve: { dedupe: ["solid-js", "@solidjs/web"] },
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
            }),
            instances: [{ browser: "chromium" }],
            commands,
        },
    },
} satisfies UserWorkspaceConfig);

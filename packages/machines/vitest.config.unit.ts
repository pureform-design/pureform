// Unit tests in Chromium through Vitest's browser mode, since the machines drive real DOM
// events and the form helpers need a real form. Set CHROMIUM_PATH to use a system Chromium
// instead of Playwright's download.

import unitTestConfig from "@pureform/vitest-config/unit";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    // Optimized up front, so Vite doesn't reload a test when it finds them.
    optimizeDeps: {
        include: [
            "@zag-js/checkbox",
            "@zag-js/collection",
            "@zag-js/combobox",
            "@zag-js/dialog",
            "@zag-js/menu",
            "@zag-js/pagination",
            "@zag-js/presence",
            "@zag-js/radio-group",
            "@zag-js/select",
            "@zag-js/switch",
            "@zag-js/tags-input",
            "@zag-js/toast",
            "@zag-js/tooltip",
            "@zag-js/vanilla",
        ],
    },
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
        },
    },
} satisfies UserWorkspaceConfig);

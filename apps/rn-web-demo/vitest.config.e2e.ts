// The demo's page in Chromium through Vitest's browser mode, built by the demo's own Vite config:
// the bundler plugin writes `.pureform/`, and React Native Web renders the page. Set
// CHROMIUM_PATH to use a system Chromium instead of Playwright's download.

import e2eTestConfig from "@pureform/vitest-config/e2e";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

export default mergeConfig(mergeConfig(baseConfig, e2eTestConfig), {
    define: {
        // React Native Web swaps Animated for a mock that ends every animation at once under
        // test; the page runs the real one.
        "process.env.NODE_ENV": JSON.stringify("development"),
    },
    optimizeDeps: {
        include: ["react", "react-dom", "react-dom/client", "react-native-web"],
    },
    test: {
        testTimeout: 60_000,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright({
                launchOptions: executablePath ? { executablePath } : {},
            }),
            instances: [
                { browser: "chromium", viewport: { width: 1280, height: 900 } },
            ],
        },
    },
} satisfies UserWorkspaceConfig);

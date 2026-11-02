import { playwright } from "@vitest/browser-playwright";
import type { UserWorkspaceConfig } from "vitest/config";

const executablePath = process.env.CHROMIUM_PATH;

// The browser test environment the component tests, and any other browser-mode config, share. Add
// the framework's plugin, and the dependencies to optimize up front (`optimizeDeps.include`), so
// Vite doesn't reload a test when it finds them.
export default {
    test: {
        browser: {
            enabled: true,
            headless: true,
            provider: playwright({
                launchOptions: executablePath ? { executablePath } : {},
            }),
            instances: [{ browser: "chromium" }],
        },
    },
} satisfies UserWorkspaceConfig;

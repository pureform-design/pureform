import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";
import baseConfig from "./vite.config.ts";
import componentTestConfig from "@{{ vars.scope_name }}/vitest-config/component";

const executablePath = process.env.CHROMIUM_PATH;

// Add the framework's plugin, and the dependencies to optimize up front (`optimizeDeps.include`),
// so Vite doesn't reload a test when it finds them.
export default mergeConfig(mergeConfig(baseConfig, componentTestConfig), {
    test: {
        browser: {
            provider: playwright({
                launchOptions: executablePath ? { executablePath } : {},
            }),
        },
    },
} satisfies UserWorkspaceConfig);

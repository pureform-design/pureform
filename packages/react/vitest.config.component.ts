// Component tests in Chromium through Vitest's browser mode, with React Testing Library. Set
// CHROMIUM_PATH to use a system Chromium instead of Playwright's download.

import componentTestConfig from "@pureform/vitest-config/component";
import { zagOptimizeDeps } from "@pureform/vitest-config/zag";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import { commands } from "./src/testing/commands.ts";
import baseConfig from "./vite.config.ts";

const executablePath = process.env.CHROMIUM_PATH;

export default mergeConfig(mergeConfig(baseConfig, componentTestConfig), {
    plugins: [react()],
    // Optimized up front, so Vite doesn't reload a test when it finds them.
    optimizeDeps: {
        include: [
            "react",
            "react-dom",
            "react-dom/client",
            "react/jsx-dev-runtime",
            "@testing-library/react",
            "@zag-js/react",
            "@zag-js/checkbox",
            ...zagOptimizeDeps({
                via: ["@pureform/machines"],
                except: ["checkbox"],
            }),
        ],
    },
    test: {
        browser: {
            provider: playwright({
                launchOptions: executablePath ? { executablePath } : {},
                // Not UTC, so a date computed in UTC instead of locally shows up (the date pickers' "today").
                contextOptions: { timezoneId: "Asia/Manila" },
            }),
            instances: [{ browser: "chromium" }],
            commands,
        },
    },
} satisfies UserWorkspaceConfig);

// Component tests in Chromium through Vitest's browser mode, since the port drives real DOM events.
// Set CHROMIUM_PATH to use a system Chromium instead of Playwright's download.

import componentTestConfig from "@pureform/vitest-config/component";
import { zagOptimizeDeps } from "@pureform/vitest-config/zag";
import solid from "@solidjs/vite-plugin";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import { commands } from "./src/testing/commands.ts";
import baseConfig from "./vite.config.ts";

const executablePath = process.env.CHROMIUM_PATH;

export default mergeConfig(mergeConfig(baseConfig, componentTestConfig), {
    plugins: [solid()],
    // The library build leaves JSX to the app; the tests compile it, and TypeScript, here.
    oxc: {},
    // Optimized up front, so Vite doesn't reload a test when it finds them.
    optimizeDeps: {
        include: [
            "@zag-js/checkbox",
            "@zag-js/radio-group",
            "@zag-js/switch",
            ...zagOptimizeDeps({
                via: ["@pureform/machines"],
                except: ["checkbox", "radio-group", "switch"],
            }),
        ],
    },
    resolve: { dedupe: ["solid-js", "@solidjs/web"] },
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

// Component tests in Chromium through Vitest's browser mode, since the port drives real DOM events.
// Set CHROMIUM_PATH to use a system Chromium instead of Playwright's download.

import componentTestConfig from "@pureform/vitest-config/component";
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
            "@pureform/machines > @zag-js/select",
            "@pureform/machines > @zag-js/menu",
            "@pureform/machines > @zag-js/pagination",
            "@pureform/machines > @zag-js/presence",
            "@pureform/machines > @zag-js/dialog",
            "@pureform/machines > @zag-js/toast",
            "@pureform/machines > @zag-js/tooltip",
            "@zag-js/switch",
            "@pureform/machines > @zag-js/tabs",
            "@pureform/machines > @zag-js/carousel",
            "@pureform/machines > @zag-js/accordion",
            "@pureform/machines > @zag-js/tree-view",
            "@pureform/machines > @zag-js/steps",
            "@pureform/machines > @zag-js/date-picker",
            "@pureform/machines > @zag-js/date-input",
            "@pureform/machines > @zag-js/combobox",
            "@pureform/machines > @zag-js/file-upload",
            "@pureform/machines > @zag-js/tags-input",
            "@pureform/machines > @zag-js/number-input",
            "@pureform/machines > @zag-js/pin-input",
            "@pureform/machines > @zag-js/clipboard",
            "@pureform/machines > @zag-js/rating-group",
            "@pureform/machines > @zag-js/toggle-group",
            "@pureform/machines > @zag-js/slider",
            "@pureform/machines > @zag-js/avatar",
            "@pureform/machines > @zag-js/listbox",
            "@pureform/machines > @zag-js/splitter",
            "@pureform/machines > @zag-js/color-picker",
            "@pureform/machines > @zag-js/anatomy",
            "@pureform/machines > @zag-js/collection",
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

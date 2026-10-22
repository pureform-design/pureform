// The stories as Vitest tests in Chromium (browser mode), one project per renderer: each story's
// `play` test and the a11y addon's checks run once in Solid, React and React Native. The plugin
// builds with `.storybook/main.ts`'s Vite config. Set CHROMIUM_PATH to use a system Chromium.
// Narrow a run by project and story: `bunx vitest run -c vitest.config.storybook.ts
// --project storybook/native -t Button`.

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const executablePath = process.env["CHROMIUM_PATH"];

const RENDERERS = ["solid", "react", "native"];

export default defineConfig({
    test: {
        projects: RENDERERS.map((renderer) => ({
            extends: true,
            plugins: [
                storybookTest({
                    configDir: ".storybook",
                    initialGlobals: { renderer },
                }),
            ],
            test: {
                name: `storybook/${renderer}`,
                testTimeout: 60_000,
                browser: {
                    enabled: true,
                    headless: true,
                    provider: playwright({
                        launchOptions: executablePath ? { executablePath } : {},
                    }),
                    instances: [{ browser: "chromium" }],
                },
            },
        })),
    },
});

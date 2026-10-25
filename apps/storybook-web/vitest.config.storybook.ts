// The stories as Vitest tests in Chromium (browser mode), one project per renderer: each story's
// `play` test and the a11y addon's checks run once in Solid, React and React Native. The plugin
// builds with `.storybook/main.ts`'s Vite config. Set CHROMIUM_PATH to use a system Chromium.
// Narrow a run by project and story: `bunx vitest run -c vitest.config.storybook.ts
// --project storybook/native -t Button`.

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import config from "./stories.config.ts";

const executablePath = process.env["CHROMIUM_PATH"];

// The renderers in `stories.config.ts` but those with `tests: false`.
const RENDERERS = Object.entries(config.renderers)
    .filter(([, renderer]) => renderer.tests !== false)
    .map(([name]) => name);

export default defineConfig({
    test: {
        projects: RENDERERS.map((renderer) => ({
            extends: true,
            // Found late (the preview's docs theme), it would reload the page mid-run.
            optimizeDeps: { include: ["storybook/theming"] },
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
                    // The component suites' viewport, so components that measure the page (the
                    // carousel) lay out as they do there.
                    instances: [
                        {
                            browser: "chromium",
                            viewport: { width: 1280, height: 900 },
                        },
                    ],
                },
            },
        })),
    },
});

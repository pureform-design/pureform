// The demo's page in Chromium through Vitest's browser mode, built by the demo's own Vite config:
// the bundler plugin writes `.pureform/`, and the page renders from it. Set CHROMIUM_PATH to use
// a system Chromium instead of Playwright's download.

import e2eTestConfig from "@pureform/vitest-config/e2e";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

// Zag's packages the components import, optimized up front, so Vite doesn't reload the test when
// it finds them.
const machines = [
    "anatomy",
    "checkbox",
    "core",
    "dom-query",
    "types",
    "utils",
].map((name) => `@pureform/solid > @pureform/machines > @zag-js/${name}`);

export default mergeConfig(mergeConfig(baseConfig, e2eTestConfig), {
    optimizeDeps: { include: machines },
    test: {
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

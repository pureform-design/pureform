// Browser tests in Chromium through Vitest's browser mode. Always Playwright's own Chromium, with
// the repo's fontconfig (`fonts.conf`) and flags that turn off hinting, subpixel text, and the GPU,
// so the screenshots draw text the same on every machine whatever its font settings.
// CHROMIUM_PATH is ignored here: a system Chromium draws text differently.

import { fileURLToPath } from "node:url";

import e2eTestConfig from "@pureform/vitest-config/e2e";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import { commands } from "./src/commands";
import baseConfig from "./vite.config";

if (process.env.CHROMIUM_PATH) {
    console.warn(
        "\n⚠ browser-e2e-tests ignores CHROMIUM_PATH: its screenshots need Playwright's own Chromium.\n" +
            "  Install it with `bun x playwright install chromium`.\n",
    );
}

const FONTCONFIG_FILE = fileURLToPath(new URL("./fonts.conf", import.meta.url));

// Text antialiased in grayscale, unhinted, at whole-pixel positions, in sRGB, drawn by the CPU.
const DETERMINISTIC_TEXT_ARGS = [
    "--font-render-hinting=none",
    "--disable-lcd-text",
    "--disable-font-subpixel-positioning",
    "--force-color-profile=srgb",
    "--disable-gpu",
];

export default mergeConfig(mergeConfig(baseConfig, e2eTestConfig), {
    test: {
        include: ["./src/**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        testTimeout: 60_000,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright({
                launchOptions: {
                    args: DETERMINISTIC_TEXT_ARGS,
                    env: { ...process.env, FONTCONFIG_FILE },
                },
                contextOptions: { reducedMotion: "reduce" },
            }),
            instances: [
                { browser: "chromium", viewport: { width: 1280, height: 900 } },
            ],
            commands,
            expect: {
                toMatchScreenshot: {
                    comparatorName: "pixelmatch",
                    comparatorOptions: { allowedMismatchedPixelRatio: 0.002 },
                },
            },
        },
    },
} satisfies UserWorkspaceConfig);

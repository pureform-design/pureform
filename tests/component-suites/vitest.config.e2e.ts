// The suites in Chromium through Vitest's browser mode, once per binding: each project compiles
// with its framework's plugin and aliases `#binding` to its harness, so every suite file runs
// against Solid and React. Set CHROMIUM_PATH to use a system Chromium instead of Playwright's
// download.

import { fileURLToPath } from "node:url";

import e2eTestConfig from "@pureform/vitest-config/e2e";
import solid from "@solidjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import type { PluginOption } from "vite";
import {
    mergeConfig,
    type TestProjectInlineConfiguration,
    type UserWorkspaceConfig,
} from "vitest/config";

import { closeServers, commands } from "./src/commands";
import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

const bindings = fileURLToPath(new URL("./src/bindings/", import.meta.url));

// Zag's packages under a binding, which the machines import.
const machines = (from: string): string[] =>
    [
        "anatomy",
        "checkbox",
        "core",
        "dom-query",
        "radio-group",
        "switch",
        "types",
        "utils",
    ].map((name) => `${from} > @pureform/machines > @zag-js/${name}`);

const binding = (
    name: "solid" | "react",
    plugin: PluginOption,
    optimize: string[],
): TestProjectInlineConfiguration => ({
    extends: true,
    plugins: [plugin],
    resolve: {
        alias: [
            {
                find: /^#binding$/,
                replacement: `${bindings}${name}/harness.tsx`,
            },
        ],
    },
    // Optimized up front, so Vite doesn't reload a test when it finds them.
    optimizeDeps: { include: optimize },
    test: { name },
});

export default mergeConfig(mergeConfig(baseConfig, e2eTestConfig), {
    plugins: [closeServers],
    test: {
        include: ["./src/**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        testTimeout: 20_000,
        setupFiles: ["./src/setup.ts"],
        browser: {
            enabled: true,
            headless: true,
            provider: playwright({
                launchOptions: executablePath ? { executablePath } : {},
                // Nothing moves, so boxes are measured at rest.
                contextOptions: { reducedMotion: "reduce" },
            }),
            instances: [
                { browser: "chromium", viewport: { width: 1280, height: 900 } },
            ],
            commands,
        },
        projects: [
            // Hydratable, as an app's client build is: the server rendering suite hydrates.
            // The plugin compiles tests non-hydratable by default.
            binding(
                "solid",
                solid({ ssr: true, solid: { hydratable: true } }),
                [...machines("@pureform/solid"), "axe-core"],
            ),
            binding("react", react(), [
                "react",
                "react-dom",
                "react-dom/client",
                "react/jsx-dev-runtime",
                "@pureform/react > @zag-js/react",
                ...machines("@pureform/react"),
                "axe-core",
            ]),
        ],
    },
} satisfies UserWorkspaceConfig);

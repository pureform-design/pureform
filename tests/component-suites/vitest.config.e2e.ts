// The suites in Chromium through Vitest's browser mode, once per binding and web target: each
// project compiles with its binding's framework plugin and aliases `#binding` to its harness, and
// aliases `#registry` to its target's registry and loads that target's stylesheet, so every suite
// file runs against Solid and React on Panda, CSS, and Tailwind. Set CHROMIUM_PATH to use a
// system Chromium instead of Playwright's download.

import { fileURLToPath } from "node:url";

import { pandacss } from "@pandacss/vite";
import e2eTestConfig from "@pureform/vitest-config/e2e";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import type { PluginOption } from "vite";
import {
    mergeConfig,
    type TestProjectInlineConfiguration,
    type UserWorkspaceConfig,
} from "vitest/config";

import { closeServers, commands } from "./src/commands";
import { generateRegistries } from "./src/targets/generated";
import { TARGETS } from "./src/targets/targets";
import type { TargetName } from "./src/targets/targets";
import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

const bindings = fileURLToPath(new URL("./src/bindings/", import.meta.url));
const targets = fileURLToPath(new URL("./src/targets/", import.meta.url));
const fixture = fileURLToPath(new URL("../panda-fixture/", import.meta.url));

// The CSS and Tailwind targets' registries and stylesheets, before any project imports them.
await generateRegistries();

// Every project's Vite server, and each one's server-rendering server, listens for SIGTERM.
process.setMaxListeners(32);

// What styles each target's stylesheet: Panda's codegen over the Panda fixture's config,
// Tailwind's compiler over the imported stylesheet, and nothing for plain CSS.
const styling: Record<TargetName, () => PluginOption[]> = {
    panda: () => [
        pandacss({ cwd: fixture, configPath: `${fixture}panda.config.ts` }),
    ],
    css: () => [],
    tailwind: () => [tailwindcss()],
};

// Zag's packages under a binding, which the machines import.
const machines = (from: string): string[] =>
    [
        "anatomy",
        "checkbox",
        "collection",
        "core",
        "dialog",
        "dom-query",
        "menu",
        "presence",
        "radio-group",
        "select",
        "switch",
        "tabs",
        "accordion",
        "tree-view",
        "toggle-group",
        "listbox",
        "tooltip",
        "types",
        "utils",
    ].map((name) => `${from} > @pureform/machines > @zag-js/${name}`);

// One project per target for a binding, named `<binding>/<target>` ("solid/css").
const binding = (
    name: "solid" | "react",
    plugin: () => PluginOption,
    optimize: string[],
): TestProjectInlineConfiguration[] =>
    TARGETS.map((target) => ({
        extends: true,
        plugins: [plugin(), ...styling[target]()],
        resolve: {
            alias: [
                {
                    find: /^#binding$/,
                    replacement: `${bindings}${name}/harness.tsx`,
                },
                {
                    find: /^#registry$/,
                    replacement: `${targets}${target}/registry.ts`,
                },
            ],
        },
        // Optimized up front, so Vite doesn't reload a test when it finds them.
        optimizeDeps: { include: optimize },
        test: {
            name: `${name}/${target}`,
            setupFiles: [`./src/targets/${target}/setup.ts`],
        },
    }));

export default mergeConfig(mergeConfig(baseConfig, e2eTestConfig), {
    plugins: [closeServers],
    test: {
        include: ["./src/**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        testTimeout: 20_000,
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
            ...binding(
                "solid",
                () => solid({ ssr: true, solid: { hydratable: true } }),
                [...machines("@pureform/solid"), "axe-core"],
            ),
            ...binding("react", () => react(), [
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

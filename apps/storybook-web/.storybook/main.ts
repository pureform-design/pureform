// One Storybook on the framework-neutral HTML host, whose single Vite build compiles Solid, React
// and React Native (through React Native Web). Solid's and React's plugins both claim JSX, so
// each gets its own files: Solid's plugin compiles `src/solid/**` and `@pureform/solid` (which
// ships JSX), and React's everything else.

import { createRequire } from "node:module";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { pandacss } from "@pandacss/vite";
import pureform from "@pureform/bundler/vite";
import solid from "@solidjs/vite-plugin";
import type { StorybookConfig } from "@storybook/html-vite";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";

import { codegen } from "../pureform.codegen.ts";

const require = createRequire(import.meta.url);
const APP = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const RN_WEB = dirname(require.resolve("react-native-web/package.json"));

/** Files Solid's plugin compiles: the Solid folder, and every package that ships Solid JSX, which
 *  is the Solid binding with its `storybook` hook. Its sources (in dev, through its
 *  `development` export) or built JSX, by the workspace's path (Bun links it) and an installed
 *  package's. */
const SOLID = [
    /\/src\/solid\/.*\.[jt]sx?$/,
    /\/packages\/solid\/.*\.[jt]sx?$/,
    /\/node_modules\/@pureform\/solid\/.*\.[jt]sx?$/,
];

const WEB_EXTENSIONS = [
    ...[".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx"].map(
        (ext) => `.web${ext}`,
    ),
    ".mjs",
    ".js",
    ".mts",
    ".ts",
    ".jsx",
    ".tsx",
    ".json",
];

export default {
    framework: "@storybook/html-vite",
    addons: ["@storybook/addon-vitest", "@storybook/addon-a11y"],
    stories: ["../src/**/*.stories.ts"],
    core: { disableTelemetry: true },
    viteFinal: (base) =>
        mergeConfig(base, {
            plugins: [
                pureform(codegen),
                pandacss(),
                solid({ include: SOLID, ssr: false, start: false }),
                react({ exclude: SOLID }),
            ],
            resolve: {
                extensions: WEB_EXTENSIONS,
                alias: {
                    // The cases' user events: Playwright's real input under Vitest (a slider
                    // reads the pointer's position, which `storybook/test`'s synthetic events
                    // don't give), `storybook/test`'s in Storybook, for the Interactions panel.
                    "#user-event": resolvePath(
                        APP,
                        process.env["VITEST"]
                            ? "src/renderers/user-event.vitest.ts"
                            : "src/renderers/user-event.ts",
                    ),
                    "react-native": RN_WEB,
                    "@react-native/assets-registry/registry": `${RN_WEB}/dist/modules/AssetRegistry/index.js`,
                },
            },
            optimizeDeps: {
                rolldownOptions: {
                    resolve: { extensions: WEB_EXTENSIONS },
                    shimMissingExports: true,
                },
            },
            build: {
                target: "esnext",
                rolldownOptions: { shimMissingExports: true },
            },
            define: {
                global: "globalThis",
                __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
            },
        }),
} satisfies StorybookConfig;

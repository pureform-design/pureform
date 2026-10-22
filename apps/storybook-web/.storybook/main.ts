// One Storybook on the framework-neutral HTML host, whose single Vite build compiles Solid, React
// and React Native (through React Native Web). Solid's and React's plugins both claim JSX, so
// each gets its own files: Solid's plugin compiles `src/solid/**` and `@pureform/solid` (which
// ships JSX), and React's everything else.

import { createRequire } from "node:module";
import { dirname } from "node:path";

import { pandacss } from "@pandacss/vite";
import pureform from "@pureform/bundler/vite";
import { runtimeStyles } from "@pureform/rn-adapter";
import { instanceTokenKeys } from "@pureform/rn-adapter/codegen";
import solid from "@solidjs/vite-plugin";
import type { StorybookConfig } from "@storybook/html-vite";
import react from "@vitejs/plugin-react";
import { mergeConfig, type Plugin } from "vite";

import { codegen, COMPONENTS } from "../pureform.codegen.ts";
import config from "../pureform.config.ts";

const require = createRequire(import.meta.url);
const RN_WEB = dirname(require.resolve("react-native-web/package.json"));

/** Files Solid's plugin compiles: the Solid folder, and the Solid binding's sources (in dev,
 *  through its `development` export) or built JSX. */
const SOLID = [/\/src\/solid\/.*\.[jt]sx?$/, /\/packages\/solid\/.*\.[jt]sx?$/];

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

const STYLES_ID = "virtual:pureform-rn";

// React Native's styles resolved at run time, as apps/rn-web-demo's `pureformRn()` does: the
// Panda registry in `.pureform/` serves Solid and React, so React Native doesn't get its own.
const pureformRn = (): Plugin => ({
    name: "pureform-rn",
    resolveId: (id) => (id === STYLES_ID ? `\0${id}` : undefined),
    load: (id) => {
        if (id !== `\0${STYLES_ID}`) return undefined;
        const specs = config.components as unknown as Record<string, never>;
        const tokens = Object.fromEntries(
            COMPONENTS.map((name) => [
                name,
                instanceTokenKeys(name, specs[name]!),
            ]),
        );
        return [
            `export const runtime = ${JSON.stringify(runtimeStyles(config, { components: COMPONENTS, fontStack: "all" }))};`,
            `export const runtimeTokens = ${JSON.stringify(tokens)};`,
        ].join("\n");
    },
});

export default {
    framework: "@storybook/html-vite",
    stories: ["../src/**/*.stories.ts"],
    core: { disableTelemetry: true },
    viteFinal: (base) =>
        mergeConfig(base, {
            plugins: [
                pureform(codegen),
                pandacss(),
                solid({ include: SOLID, ssr: false, start: false }),
                react({ exclude: SOLID }),
                pureformRn(),
            ],
            resolve: {
                extensions: WEB_EXTENSIONS,
                alias: {
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

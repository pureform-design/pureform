import { createRequire } from "node:module";
import { dirname } from "node:path";

import { materialColor } from "@pureform/material";
import { pureform } from "@pureform/preset";
import { precompute, resolveTheme, runtimeStyles } from "@pureform/rn-adapter";
import type { ThemeValues } from "@pureform/rn-adapter";
import { createConfig } from "@pureform/vite-config/app";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

import packageJson from "./package.json";

const require = createRequire(import.meta.url);

const RN_WEB = dirname(require.resolve("react-native-web/package.json"));

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
import { BRAND_TOKENS, BRANDS, COMPONENTS, config } from "./src/config";

const STYLES_ID = "virtual:pureform-rn";

// Each brand's primary family for light and dark, generated from its seed here, so the page
// overrides with plain values and ships no color generation.
const brandOverrides = () => {
    const generated = pureform({
        themes: Object.fromEntries(
            Object.entries(BRANDS).map(([name, seed]) => [
                name,
                { color: materialColor({ seed }) },
            ]),
        ),
    });
    // Semantic colors only: the raw palette shares the names (`colors.primaryLight`).
    const semantic = new Set(
        Object.keys(generated.semanticTokens.colors ?? {}).map(
            (name) => `colors.${name}`,
        ),
    );
    const family = (values: ThemeValues): ThemeValues =>
        Object.fromEntries(
            Object.entries(values).filter(
                ([key]) => semantic.has(key) && BRAND_TOKENS.test(key),
            ),
        );
    return Object.fromEntries(
        Object.keys(BRANDS).map((theme) => [
            theme,
            {
                light: family(
                    resolveTheme(generated, { scheme: "light", theme }),
                ),
                dark: family(
                    resolveTheme(generated, { scheme: "dark", theme }),
                ),
            },
        ]),
    );
};

// The styles are built here, so the page ships the runtime and the data, not the config,
// the lowering, or the color library.
const pureformRn = (): Plugin => ({
    name: "pureform-rn",
    resolveId: (id) => (id === STYLES_ID ? `\0${id}` : undefined),
    load: (id) => {
        if (id !== `\0${STYLES_ID}`) return undefined;
        // React Native Web passes font families to CSS, so the whole stack applies.
        const options = { components: COMPONENTS, fontStack: "all" as const };
        return [
            `export const precomputed = ${JSON.stringify(precompute(config, options))};`,
            `export const runtime = ${JSON.stringify(runtimeStyles(config, options))};`,
            `export const brands = ${JSON.stringify(brandOverrides())};`,
        ].join("\n");
    },
});

export default createConfig({
    package: packageJson,
    overrides: {
        plugins: [react(), pureformRn()],
        resolve: {
            // React Native libraries such as react-native-svg pick their web build by these.
            extensions: WEB_EXTENSIONS,
            // An absolute path, so the adapter's built files, outside this app, find it too.
            alias: {
                "react-native": RN_WEB,
                // React Native's asset registry, which react-native-svg reads for images.
                "@react-native/assets-registry/registry": `${RN_WEB}/dist/modules/AssetRegistry/index.js`,
            },
        },
        // react-native-svg imports native modules behind Android checks, which React Native
        // Web doesn't export; they're never reached on the web.
        optimizeDeps: {
            rolldownOptions: {
                resolve: { extensions: WEB_EXTENSIONS },
                shimMissingExports: true,
            },
        },
        build: { rolldownOptions: { shimMissingExports: true } },
        // Parts of React Native Web's Animated refer to Node's `global`, and Reanimated to
        // React Native's `__DEV__`.
        define: {
            global: "globalThis",
            __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
        },
    },
});

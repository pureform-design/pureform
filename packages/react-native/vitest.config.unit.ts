// Unit tests in Chromium through Vitest's browser mode, rendering through React Native Web, with
// React Testing Library. Set CHROMIUM_PATH to use a system Chromium instead of Playwright's
// download.

import { createRequire } from "node:module";
import { dirname } from "node:path";

import unitTestConfig from "@pureform/vitest-config/unit";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import { commands } from "./src/testing/commands";
import baseConfig from "./vite.config";

const executablePath = process.env.CHROMIUM_PATH;

const RN_WEB = dirname(
    createRequire(import.meta.url).resolve("react-native-web/package.json"),
);

// React Native libraries such as react-native-svg pick their web build by these.
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

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    plugins: [react()],
    resolve: {
        extensions: WEB_EXTENSIONS,
        alias: [
            { find: /^react-native$/, replacement: RN_WEB },
            // React Native's asset registry, which react-native-svg reads for images.
            {
                find: "@react-native/assets-registry/registry",
                replacement: `${RN_WEB}/dist/modules/AssetRegistry/index.js`,
            },
        ],
    },
    define: {
        // Parts of React Native Web's Animated refer to Node's `global`, and Reanimated to
        // React Native's `__DEV__`.
        global: "globalThis",
        __DEV__: "true",
        // React Native Web swaps Animated for a mock that ends every animation at once under
        // test; the real one runs here.
        "process.env.NODE_ENV": JSON.stringify("development"),
    },
    optimizeDeps: {
        include: [
            "react",
            "react-dom",
            "react-dom/client",
            "react/jsx-dev-runtime",
            "@testing-library/react",
            "react-native-web",
        ],
        rolldownOptions: {
            resolve: { extensions: WEB_EXTENSIONS },
            shimMissingExports: true,
        },
    },
    test: {
        testTimeout: 5000,
        include: ["./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        exclude: [
            "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        ],
        browser: {
            enabled: true,
            headless: true,
            provider: playwright({
                launchOptions: executablePath ? { executablePath } : {},
            }),
            instances: [{ browser: "chromium" }],
            commands,
        },
    },
} satisfies UserWorkspaceConfig);

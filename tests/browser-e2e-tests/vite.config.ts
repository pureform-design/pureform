// Renders the Panda fixture's page and recipes (`tests/panda-fixture`) inside the tests with the
// fixture's own Panda config, so no dev server is needed.

import { fileURLToPath } from "node:url";

import { pandacss } from "@pandacss/vite";
import { createConfig } from "@pureform/vite-config/test";
import solid from "@solidjs/vite-plugin";

import packageJson from "./package.json" with { type: "json" };

const fixture = fileURLToPath(new URL("../panda-fixture/", import.meta.url));

// The React Native binding's built files: its sources are React's JSX, which Solid's plugin here
// would compile as Solid's.
const reactNative = fileURLToPath(
    new URL("../../packages/react-native/dist/", import.meta.url),
);

export default createConfig({
    package: packageJson,

    overrides: {
        plugins: [
            pandacss({
                cwd: fixture,
                configPath: `${fixture}panda.config.ts`,
                transform: true,
            }),
            solid(),
        ],
        resolve: {
            alias: [
                { find: /^\$(.*)$/, replacement: `${fixture}styled-system/$1` },
                { find: /^#(.*)$/, replacement: `${fixture}src/$1` },
                {
                    find: /^@pureform\/react-native$/,
                    replacement: `${reactNative}index.mjs`,
                },
                {
                    find: /^@pureform\/react-native\/(.*)$/,
                    replacement: `${reactNative}$1.mjs`,
                },
                // React Native components render through React Native Web.
                { find: /^react-native$/, replacement: "react-native-web" },
            ],
            dedupe: ["solid-js", "@solidjs/web"],
        },
        define: {
            // Parts of React Native Web's Animated refer to Node's `global`.
            global: "globalThis",
            // React Native Web swaps Animated for a mock that ends every animation at once
            // under test, and the motion tests need the real one.
            "process.env.NODE_ENV": JSON.stringify("development"),
        },
    },
});

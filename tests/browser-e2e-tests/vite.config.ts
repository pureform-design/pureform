// Renders the demo's page inside the tests with the demo's own Panda config and recipes, so no
// dev server is needed.

import { fileURLToPath } from "node:url";

import { pandacss } from "@pandacss/vite";
import { createConfig } from "@pureform/vite-config/test";
import solid from "@solidjs/vite-plugin";

import packageJson from "./package.json";

const demo = fileURLToPath(new URL("../../apps/solid-demo/", import.meta.url));

export default createConfig({
    package: packageJson,

    overrides: {
        plugins: [
            pandacss({
                cwd: demo,
                configPath: `${demo}panda.config.ts`,
                transform: true,
            }),
            solid(),
        ],
        resolve: {
            alias: [
                { find: /^\$(.*)$/, replacement: `${demo}styled-system/$1` },
                { find: /^#(.*)$/, replacement: `${demo}src/$1` },
            ],
            dedupe: ["solid-js", "@solidjs/web"],
        },
    },
});

// Styles the suites with the demo's Panda config and registry (`apps/solid-demo`), so components
// render with their real classes and layout. The framework plugins are per Vitest project.

import { fileURLToPath } from "node:url";

import { pandacss } from "@pandacss/vite";
import { createConfig } from "@pureform/vite-config/test";

import packageJson from "./package.json";

const demo = fileURLToPath(new URL("../../apps/solid-demo/", import.meta.url));

export default createConfig({
    package: packageJson,

    overrides: {
        plugins: [
            pandacss({ cwd: demo, configPath: `${demo}panda.config.ts` }),
        ],
        resolve: {
            dedupe: ["solid-js", "@solidjs/web", "react", "react-dom"],
        },
    },
});

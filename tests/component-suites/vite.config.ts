// The suites' shared Vite config. Each Vitest project adds its binding's framework plugin and its
// target's styling (`vitest.config.browser.ts`).

import { createConfig } from "@pureform/vite-config/test";

import packageJson from "./package.json" with { type: "json" };

export default createConfig({
    package: packageJson,

    overrides: {
        resolve: {
            dedupe: ["solid-js", "@solidjs/web", "react", "react-dom"],
        },
    },
});

import { precompute, runtimeStyles } from "@pureform/rn-adapter";
import { createConfig } from "@pureform/vite-config/app";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

import packageJson from "./package.json";
import { COMPONENTS, config } from "./src/config";

const STYLES_ID = "virtual:pureform-rn";

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
        ].join("\n");
    },
});

export default createConfig({
    package: packageJson,
    overrides: {
        plugins: [react(), pureformRn()],
        resolve: {
            alias: { "react-native": "react-native-web" },
        },
    },
});

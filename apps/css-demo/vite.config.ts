import pureform, { PureformPluginOptions } from "@pureform/bundler/vite";
import { CssCodegenOptions } from "@pureform/css-adapter/codegen";
import { createConfig } from "@pureform/vite-config/app";
import solid from "@solidjs/vite-plugin";

import packageJson from "./package.json" with { type: "json" };

export const codegen = {
    target: "css",
    // Classes as `pf-button__root`, component vars as `--pf-components-button-radius`.
    options: { prefix: "pf", classPrefix: "pf" },
} satisfies PureformPluginOptions<CssCodegenOptions>;

export default createConfig({
    package: packageJson,
    overrides: {
        // pureform writes `.pureform/` (the registry and `styles.css`) when dev or build starts.
        plugins: [pureform(codegen), solid()],
    },
});

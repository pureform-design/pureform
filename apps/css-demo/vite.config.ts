import pureform from "@pureform/bundler/vite";
import { createConfig } from "@pureform/vite-config/app";
import solid from "@solidjs/vite-plugin";

import packageJson from "./package.json" with { type: "json" };
import { codegen } from "./pureform.codegen";

export default createConfig({
    package: packageJson,
    overrides: {
        // pureform writes `.pureform/` (the registry and `styles.css`) when dev or build starts.
        plugins: [pureform(codegen), solid()],
    },
});

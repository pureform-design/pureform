import pureform from "@pureform/bundler/vite";
import { createConfig } from "@pureform/vite-config/app";
import solid from "@solidjs/vite-plugin";

import packageJson from "./package.json";
import { glue } from "./pureform.glue";

export default createConfig({
    package: packageJson,
    overrides: {
        // pureform writes `.pureform/` (the registry and `styles.css`) when dev or build starts.
        plugins: [pureform(glue), solid()],
    },
});

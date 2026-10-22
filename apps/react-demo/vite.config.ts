import { pandacss } from "@pandacss/vite";
import pureform from "@pureform/bundler/vite";
import { createConfig } from "@pureform/vite-config/app";
import react from "@vitejs/plugin-react";

import packageJson from "./package.json" with { type: "json" };
import { codegen } from "./pureform.codegen";

export default createConfig({
    package: packageJson,
    overrides: {
        // pureform writes `.pureform/` before Panda reads its config.
        plugins: [pureform(codegen), pandacss(), react()],
    },
});

import pureform from "@pureform/bundler/vite";
import { createConfig } from "@pureform/vite-config/app";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

import packageJson from "./package.json" with { type: "json" };
import { codegen } from "./pureform.codegen.ts";

export default createConfig({
    package: packageJson,
    overrides: {
        // pureform writes `.pureform/styles.css` when dev or build starts, before Tailwind's
        // plugin reads `src/app.css`, which imports it.
        plugins: [pureform(codegen), tailwindcss(), solid()],
    },
});

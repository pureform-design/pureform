import pureform from "@pureform/bundler/vite";
import { createConfig } from "@pureform/vite-config/app";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

import packageJson from "./package.json";
import { glue } from "./pureform.glue";

export default createConfig({
    package: packageJson,
    overrides: {
        // pureform writes `.pureform/styles.css` when dev or build starts, before Tailwind's
        // plugin reads `src/app.css`, which imports it.
        plugins: [pureform(glue), tailwindcss(), solid()],
    },
});

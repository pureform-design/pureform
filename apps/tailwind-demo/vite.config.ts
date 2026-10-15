import { pureformTailwind } from "@pureform/tailwind-adapter/vite";
import { createConfig } from "@pureform/vite-config/app";
import tailwindcss from "@tailwindcss/vite";

import packageJson from "./package.json";
import { config } from "./src/config";

export default createConfig({
    package: packageJson,
    overrides: {
        // pureform's plugin writes the stylesheet before Tailwind's reads it.
        plugins: [
            pureformTailwind({
                config,
                outFile: "src/pureform.gen.css",
                dts: "src/pureform.d.ts",
            }),
            tailwindcss(),
        ],
    },
});

import { pureformCss } from "@pureform/css-adapter/vite";
import { createConfig } from "@pureform/vite-config/app";

import packageJson from "./package.json";
import { config } from "./src/config";

export default createConfig({
    package: packageJson,
    overrides: {
        plugins: [pureformCss({ config, dts: "src/pureform.d.ts" })],
    },
});

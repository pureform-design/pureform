import { pandacss } from "@pandacss/vite";
import { createConfig } from "@pureform/vite-config/app";
import react from "@vitejs/plugin-react";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,
    overrides: {
        plugins: [pandacss(), react()],
    },
});

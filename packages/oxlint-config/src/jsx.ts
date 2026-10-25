import { defineConfig } from "oxlint";

const config = createConfig();

export default config;

export function createConfig() {
    return defineConfig({
        plugins: ["jsx-a11y"],
    });
}

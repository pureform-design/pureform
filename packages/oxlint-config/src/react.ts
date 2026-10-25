import { defineConfig } from "oxlint";

const config = createConfig();

export default config;

export function createConfig() {
    return defineConfig({
        plugins: ["react", "react-perf"],
    });
}

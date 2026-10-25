import { defineConfig } from "oxlint";

const base = createConfig();

export default base;

export function createConfig() {
    return defineConfig({
        plugins: ["jsdoc", "promise", "vitest"],
    });
}

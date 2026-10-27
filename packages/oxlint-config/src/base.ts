import { defineConfig } from "oxlint";

const base = createConfig();

export default base;

export function createConfig() {
    return defineConfig({
        plugins: ["jsdoc", "promise", "vitest"],
        rules: {
            // Storybook's prop-controls generator reads this custom JSDoc tag.
            "jsdoc/check-tag-names": ["warn", { definedTags: ["control"] }],
            // Vitest's `expect` takes a message to show when the assertion fails: `expect(value, name)`.
            "vitest/valid-expect": ["warn", { maxArgs: 2 }],
        },
    });
}

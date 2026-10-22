// What `scripts/generate-stories.ts` writes stories from: the renderers, the components, and the
// shared hooks. See the README for adding to each.

import { defineStories } from "./src/renderers/config";

export default defineStories({
    renderers: {
        solid: {
            package: "@pureform/solid",
            adapter: "./src/solid/adapter.ts",
            export: "solidAdapter",
            hooks: "@pureform/solid/storybook",
        },
        react: {
            package: "@pureform/react",
            adapter: "./src/react/adapter.ts",
            export: "reactAdapter",
            hooks: "@pureform/react/storybook",
        },
        native: {
            package: "@pureform/react-native",
            adapter: "./src/native/adapter.ts",
            export: "nativeAdapter",
            hooks: "@pureform/react-native/storybook",
        },
    },
    components: {
        Button: {
            args: { label: "Save", disabled: false },
            variants: ["filled", "tonal", "elevated", "outlined", "text"],
            hooks: ["./src/components/button.ts"],
        },
        Switch: {
            args: { "aria-label": "Wi-Fi", disabled: false },
            hooks: ["./src/components/switch.ts"],
        },
        TextField: {
            args: { label: "Name", disabled: false },
            variants: ["filled", "outlined"],
            hooks: ["./src/components/text-field.ts"],
        },
    },
    hooks: ["./src/hooks.ts"],
});

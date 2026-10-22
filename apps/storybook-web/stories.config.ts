// What `scripts/generate-stories.ts` needs besides the anatomy and the component cases: the
// renderers, the shared hooks, and overrides (which components, skips, args, schemes). See the README for adding to each.

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
            // The cases read the web bindings' DOM (a button's `aria-pressed`, the switch's
            // native input, the field's `data-pf-filled`), which React Native Web doesn't draw.
            casePlays: false,
        },
    },
    // The first slice; drop `include` to draw every component with an anatomy and a case.
    include: ["Button", "Switch", "TextField"],
    components: {
        Button: {
            // Variants the binding derives (from `selected`, a group, the provider).
            controls: { exclude: ["toggle", "position", "density"] },
            schemes: ["light", "dark"],
        },
        Switch: {
            controls: { exclude: ["icons"] },
            schemes: ["light", "dark"],
        },
        TextField: {
            // Derived from the icons and affixes given, and the provider's density.
            controls: {
                exclude: [
                    "leadingIcon",
                    "trailingIcon",
                    "prefixText",
                    "suffixText",
                    "density",
                ],
            },
            // React Native Web draws a disabled field as `readonly`, which axe holds to the
            // contrast ratio a disabled one is exempt from.
            stories: { Disabled: { parameters: { a11y: { test: "todo" } } } },
            schemes: ["light", "dark"],
        },
    },
    hooks: ["./src/hooks.ts"],
});

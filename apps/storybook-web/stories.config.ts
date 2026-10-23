// What `scripts/generate-stories.ts` needs besides the anatomy and the component cases: the
// renderers, the shared hooks, and overrides (skips, args, schemes). Every component with an
// anatomy and a case is drawn. See the README for adding to each.

import { defineStories } from "./src/renderers/config";

export default defineStories({
    // The controls come from React's exports' props (Solid's agree; see the README).
    controls: "react",
    renderers: {
        solid: {
            package: "@pureform/solid",
            adapter: "./src/solid/adapter.ts",
            export: "solidAdapter",
            hooks: "@pureform/solid/storybook",
            scenes: {
                module: "./src/solid/scenes.ts",
                components: ["Toast", "GridList"],
            },
        },
        react: {
            package: "@pureform/react",
            adapter: "./src/react/adapter.ts",
            export: "reactAdapter",
            hooks: "@pureform/react/storybook",
            scenes: {
                module: "./src/react/scenes.ts",
                components: ["Toast", "GridList"],
            },
        },
        native: {
            package: "@pureform/react-native",
            adapter: "./src/native/adapter.ts",
            export: "nativeAdapter",
            hooks: "@pureform/react-native/storybook",
            scenes: {
                module: "./src/native/scenes.ts",
                components: ["Toast", "GridList"],
            },
            // React Native skipped for now; needs renderer-neutral readers. The cases read the
            // web bindings' DOM (a button's `aria-pressed`, the switch's native input, the
            // field's `data-pf-filled`), which React Native Web doesn't draw, so its stories
            // run without the generated plays and stay out of the story tests. They still draw
            // in Storybook.
            casePlays: false,
            tests: false,
        },
    },
    schemes: ["light", "dark"],
    // Floating and modal overlays open into the canvas; this keeps room for them.
    overlayHeight: 480,
    components: {
        // Both act on what's around them: a surface to press, and content to dim.
        Ripple: { hooks: ["./src/stages/ripple.ts"] },
        Scrim: { hooks: ["./src/stages/scrim.ts"] },
        // Their cases carry data (`toasts`, `tiles`) that each renderer's scenes turn into
        // children; the plays check it is drawn.
        Toast: { hooks: ["./src/stages/toast.ts"] },
        GridList: { hooks: ["./src/stages/grid-list.ts"] },
        TextField: {
            // React Native Web: the disabled field's input is `disabled` now (not `readonly`)
            // and passes, but its label is a plain text element, not the input's `<label>`, so
            // axe holds its disabled color to the contrast ratio (React Native only; parameters
            // can't vary by renderer).
            stories: { Disabled: { parameters: { a11y: { test: "todo" } } } },
        },
        Carousel: {
            // In the story tests axe finds focusable masks inside the items Zag hides
            // (`aria-hidden-focus`), and the pinned copies' state play reads page 2 for 1: the
            // items are sized from the row's width once mounted (the case's `measured`), which
            // the Storybook canvas gives differently from the component suites' page.
            parameters: { a11y: { test: "todo" } },
            stories: {
                Light: { tags: ["!test"] },
                Dark: { tags: ["!test"] },
            },
        },
    },
    hooks: ["./src/hooks.ts"],
});

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
            // React Native skipped for now; needs renderer-neutral readers. The cases read the
            // web bindings' DOM (a button's `aria-pressed`, the switch's native input, the
            // field's `data-pf-filled`), which React Native Web doesn't draw, so its stories
            // run without the generated plays and stay out of the story tests. They still draw
            // in Storybook.
            casePlays: false,
            tests: false,
        },
    },
    skip: {
        // Its case renders a toaster from `toasts` data (`createToaster` + `Toaster`, the
        // suites' `ToastScene`); the binding exports no `Toast` that takes it.
        Toast: "needs a toaster scene: the case's `toasts` aren't props of an export",
        // Its case's `tiles` are data the suites' `GridListScene` turns into
        // `GridList.Tile` children; `GridList` itself takes children, not `tiles`.
        GridList:
            "needs a tiles scene: the case's `tiles` aren't props of `GridList`",
    },
    schemes: ["light", "dark"],
    // Floating and modal overlays open into the canvas; this keeps room for them.
    overlayHeight: 480,
    components: {
        // Both act on what's around them: a surface to press, and content to dim.
        Ripple: { hooks: ["./src/stages/ripple.ts"] },
        Scrim: { hooks: ["./src/stages/scrim.ts"] },
        // The plain form primitives, in a group of their own: the Textarea's name differs from
        // Material's TextArea only in case, which Storybook's ids ignore.
        Field: { title: "Plain form/Field" },
        Label: { title: "Plain form/Label" },
        Textarea: { title: "Plain form/Textarea" },
        Description: { title: "Plain form/Description" },
        ErrorText: { title: "Plain form/ErrorText" },
        Input: {
            title: "Plain form/Input",
            // A DOM prop, so the props give it no control; the date and time types open the
            // browser's own pickers.
            argTypes: {
                type: {
                    control: "select",
                    options: [
                        "text",
                        "email",
                        "password",
                        "number",
                        "date",
                        "time",
                        "datetime-local",
                    ],
                },
            },
        },
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

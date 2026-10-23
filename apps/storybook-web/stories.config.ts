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
        Ripple: {
            hooks: ["./src/stages/ripple.ts"],
            // React Native has no ripple layer to place: its pressable components draw their
            // own ripple.
            parameters: {
                pureform: {
                    absent: {
                        native: "React Native's pressable components draw their own ripple; there's no separate layer to place.",
                    },
                },
            },
        },
        Scrim: { hooks: ["./src/stages/scrim.ts"] },
        // Invisible on its own: drawn in a small element, its area outlined.
        TouchTarget: { hooks: ["./src/stages/touch-target.ts"] },
        FabMenu: {
            // An app places it at the screen's bottom end, and its list opens above it: at the
            // canvas's top, the list would open off the top of the frame.
            parameters: { pureform: { place: "bottom-end" } },
            hooks: ["./src/fab-menu.hooks.ts"],
        },
        // They fill their parent, so they draw in a frame of a set size.
        Splitter: { hooks: ["./src/stages/splitter.ts"] },
        Media: { hooks: ["./src/stages/media.ts"] },
        Switch: { hooks: ["./src/checks/switch.ts"] },
        Badge: { hooks: ["./src/checks/badge.ts"] },
        Slider: { hooks: ["./src/checks/slider.ts"] },
        CopyButton: { hooks: ["./src/checks/copy-button.ts"] },
        // Their cases carry data (`toasts`, `tiles`) that each renderer's scenes turn into
        // children; the plays check it is drawn.
        Toast: { hooks: ["./src/stages/toast.ts"] },
        GridList: { hooks: ["./src/stages/grid-list.ts"] },
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
        Carousel: {
            // Its items are sized from the row's width once mounted (the case's `measured`): a
            // frame as wide as the component suites' page (their 1280px viewport, the reset's
            // margin-free body), with no canvas padding, and the story tests' viewport at that
            // width too (the Vitest addon's default is 1200px).
            parameters: {
                layout: "fullscreen",
                pureform: { width: 1280 },
                viewport: {
                    options: {
                        suites: {
                            name: "Component suites",
                            styles: { width: "1280px", height: "900px" },
                        },
                    },
                    defaultViewport: "suites",
                },
            },
        },
    },
    hooks: ["./src/hooks.ts"],
});

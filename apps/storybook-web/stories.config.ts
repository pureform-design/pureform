// What `scripts/generate-stories.ts` needs besides the anatomy and the component cases: the
// renderers, the shared hooks, and overrides (skips, args, schemes). Every component with an
// anatomy and a case is drawn. See the README for adding to each.

import type { RendererSkip } from "./src/renderers/compose";
import { defineStories } from "./src/renderers/config";

// React Native's narrow exceptions, by story export name (`"*"`: every story), each for what the
// platform can't do; `parameters.pureform.skip` (see `RendererSkip`).
const native = (stories: Readonly<Record<string, RendererSkip>>) => ({
    pureform: { skip: { native: stories } },
});

/** The web's click bubbles from the item a key pressed to the component's root `onClick`, which
 *  the key plays spy on. React Native has no bubbling, and its composites take no root press. */
const NO_BUBBLING =
    "React Native doesn't bubble a press to its composite's root, which takes no onPress: the key's click reaches the item's own handler only.";
/** React Native Web draws a disabled field's label (and the file upload's headline) as plain
 *  text in the disabled colors, not as a disabled control's `<label>`, so axe holds it to the
 *  contrast rule a disabled control's text is exempt from. */
const DISABLED_TEXT = {
    a11y: {
        "color-contrast":
            "React Native Web's disabled label is plain text, which axe doesn't exempt as a disabled control's.",
    },
};
const NO_FILE_INPUT =
    "React Native has no file input to give files to: its trigger calls the app's onPick.";
const NO_CAROUSEL_KEYS =
    "React Native's carousel pages follow its native scroll; arrow keys between items would have to drive it.";
const keyClicks = (...stories: readonly string[]) =>
    native(
        Object.fromEntries(
            stories.map((story) => [story, { play: NO_BUBBLING }]),
        ),
    );

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
        Scrim: {
            hooks: ["./src/stages/scrim.ts"],
            // Every React Native Web view is a positioned container, so its scrim fills the
            // story's root view inside the stage's padding, not the stage the play measures.
            parameters: native({
                "*": {
                    play: "React Native's scrim fills its nearest view (every view is positioned), inside the stage's padding.",
                },
            }),
        },
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
        ButtonGroup: { parameters: keyClicks("KeyEnter", "KeySpace") },
        ChipSet: { parameters: keyClicks("KeyEnter", "KeySpace") },
        SplitButton: { parameters: keyClicks("KeyEnter", "KeySpace") },
        List: { parameters: keyClicks("KeyEnter") },
        Snackbar: { parameters: keyClicks("KeyEnter", "KeySpace") },
        Stepper: { parameters: keyClicks("KeyEnter", "KeySpace") },
        Table: { parameters: keyClicks("KeyEnter", "KeySpace") },
        Tabs: { parameters: keyClicks("KeyEnter", "KeySpace") },
        Toolbar: { parameters: keyClicks("KeyEnter", "KeySpace") },
        TimePicker: {
            parameters: native({
                KeyEnter: { play: NO_BUBBLING },
                // The chosen minute is white over the dial's handle, a sibling drawn under it
                // rather than its ancestor, so axe reads the dial's surface as its background.
                TheMinutes: {
                    a11y: {
                        "color-contrast":
                            "The chosen label's background is the dial's handle, a sibling under it, which axe doesn't see.",
                    },
                },
            }),
        },
        CodeField: { parameters: native({ Disabled: DISABLED_TEXT }) },
        NumberField: { parameters: native({ Disabled: DISABLED_TEXT }) },
        TagsInput: { parameters: native({ Disabled: DISABLED_TEXT }) },
        FileUpload: {
            parameters: native({
                Disabled: DISABLED_TEXT,
                // React Native has no file input: its file upload's trigger calls the app's
                // `onPick`, so the state play has nothing to give files to.
                Light: { play: NO_FILE_INPUT },
                Dark: { play: NO_FILE_INPUT },
            }),
        },
        Tooltip: { parameters: keyClicks("KeyEnter") },
        Tree: {
            // React Native's branch is a tree item holding its children's group (APG), named
            // from its row's text alone (`aria-labelledby`); axe's heuristic wants an element's
            // whole visible text, its children's labels too, in its name.
            parameters: native({
                "*": {
                    a11y: {
                        "label-content-name-mismatch":
                            "A tree branch is named from its row, not from the children's labels it holds.",
                    },
                },
            }),
        },
        RichTooltip: { parameters: keyClicks("KeyEnter") },
        Carousel: {
            // Its items are sized from the row's width once mounted (the case's `measured`): a
            // frame as wide as the component suites' page (their 1280px viewport, the reset's
            // margin-free body), with no canvas padding, and the story tests' viewport at that
            // width too (the Vitest addon's default is 1200px).
            parameters: {
                layout: "fullscreen",
                pureform: {
                    width: 1280,
                    // React Native's pages follow its native scroll, and it has no arrow keys
                    // between its items: they would have to drive that scroll.
                    skip: {
                        native: {
                            Light: { play: NO_CAROUSEL_KEYS },
                            Dark: { play: NO_CAROUSEL_KEYS },
                        },
                    },
                },
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

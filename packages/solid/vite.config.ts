import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json" with { type: "json" };

export default createConfig({
    package: packageJson,

    overrides: {
        // JSX stays as written: an app's Solid plugin compiles it for the DOM or the server.
        oxc: false,
        build: {
            rolldownOptions: {
                transform: { jsx: "preserve" },
                // Shared chunks hold JSX too, so they're `.jsx` like the entries: an app's Solid
                // plugin only reads JSX in files named so.
                output: { chunkFileNames: "[name]-[hash].jsx" },
            },
            // Renaming would turn a component (`<Tag>`) into a lowercase tag the Solid plugin
            // reads as an element.
            minify: false,
            lib: {
                entry: {
                    index: "src/index.ts",
                    button: "src/button/index.ts",
                    checkbox: "src/checkbox/index.ts",
                    chip: "src/chip/index.ts",
                    fab: "src/fab/index.ts",
                    "fab-menu": "src/fab-menu/index.ts",
                    "split-button": "src/split-button/index.ts",
                    "icon-button": "src/icon-button/index.ts",
                    "button-group": "src/button-group/index.ts",
                    "chip-set": "src/chip-set/index.ts",
                    "selection-list": "src/selection-list/index.ts",
                    paginator: "src/paginator/index.ts",
                    "radio-group": "src/radio-group/index.ts",
                    select: "src/select/index.ts",
                    menu: "src/menu/index.ts",
                    dialog: "src/dialog/index.ts",
                    "fullscreen-dialog": "src/fullscreen-dialog/index.ts",
                    "bottom-sheet": "src/bottom-sheet/index.ts",
                    "side-sheet": "src/side-sheet/index.ts",
                    "drag-handle": "src/drag-handle/index.ts",
                    tooltip: "src/tooltip/index.ts",
                    "rich-tooltip": "src/rich-tooltip/index.ts",
                    snackbar: "src/snackbar/index.ts",
                    toast: "src/toast/index.ts",
                    toolbar: "src/toolbar/index.ts",
                    tabs: "src/tabs/index.ts",
                    carousel: "src/carousel/index.ts",
                    accordion: "src/accordion/index.ts",
                    tree: "src/tree/index.ts",
                    stepper: "src/stepper/index.ts",
                    "grid-list": "src/grid-list/index.ts",
                    "tags-input": "src/tags-input/index.ts",
                    "navigation-bar": "src/navigation-bar/index.ts",
                    "navigation-rail": "src/navigation-rail/index.ts",
                    list: "src/list/index.ts",
                    "list-item": "src/list-item/index.ts",
                    switch: "src/switch/index.ts",
                    "text-area": "src/text-area/index.ts",
                    "text-field": "src/text-field/index.ts",
                    avatar: "src/avatar/index.ts",
                    badge: "src/badge/index.ts",
                    card: "src/card/index.ts",
                    "circular-progress": "src/circular-progress/index.ts",
                    "loading-indicator": "src/loading-indicator/index.ts",
                    icon: "src/icon/index.ts",
                    "linear-progress": "src/linear-progress/index.ts",
                    media: "src/media/index.ts",
                    ripple: "src/ripple/index.ts",
                    scrim: "src/scrim/index.ts",
                    "app-bar": "src/app-bar/index.ts",
                    table: "src/table/index.ts",
                    "time-picker": "src/time-picker/index.ts",
                    "time-input": "src/time-input/index.ts",
                    "search-bar": "src/search-bar/index.ts",
                    "search-view": "src/search-view/index.ts",
                    autocomplete: "src/autocomplete/index.ts",
                    "date-picker": "src/date-picker/index.ts",
                    "docked-date-picker": "src/docked-date-picker/index.ts",
                    "date-input": "src/date-input/index.ts",
                    separator: "src/separator/index.ts",
                    slider: "src/slider/index.ts",
                    "supporting-text": "src/supporting-text/index.ts",
                    text: "src/text/index.ts",
                    "touch-target": "src/touch-target/index.ts",
                    storybook: "src/storybook/index.ts",
                    // `internal/zag/index`, not `internal/zag`: a `dist/internal/zag.jsx` beside the
                    // `dist/internal/zag/` declarations would win the declarations' extensionless
                    // `./internal/zag` imports in a consumer with `allowJs`, type-checking the JS.
                    "internal/zag/index": "src/internal/zag/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "solid"}.${format === "cjs" ? "cjs" : "jsx"}`,
                name: "Solid",
            },
        },
    },
});

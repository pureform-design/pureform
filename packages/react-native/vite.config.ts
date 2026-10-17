import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    svg: "src/engines/svg.ts",
                    reanimated: "src/engines/reanimated.ts",
                    "reanimated-svg": "src/engines/reanimated-svg.ts",
                    avatar: "src/avatar/index.ts",
                    button: "src/button/index.ts",
                    card: "src/card/index.ts",
                    checkbox: "src/checkbox/index.ts",
                    chip: "src/chip/index.ts",
                    "circular-progress": "src/circular-progress/index.ts",
                    dialog: "src/dialog/index.ts",
                    fab: "src/fab/index.ts",
                    icon: "src/icon/index.ts",
                    "icon-button": "src/icon-button/index.ts",
                    "linear-progress": "src/linear-progress/index.ts",
                    "list-item": "src/list-item/index.ts",
                    media: "src/media/index.ts",
                    menu: "src/menu/index.ts",
                    "navigation-bar": "src/navigation-bar/index.ts",
                    "navigation-rail": "src/navigation-rail/index.ts",
                    "radio-group": "src/radio-group/index.ts",
                    scrim: "src/scrim/index.ts",
                    "search-bar": "src/search-bar/index.ts",
                    select: "src/select/index.ts",
                    separator: "src/separator/index.ts",
                    slider: "src/slider/index.ts",
                    snackbar: "src/snackbar/index.ts",
                    "supporting-text": "src/supporting-text/index.ts",
                    switch: "src/switch/index.ts",
                    tabs: "src/tabs/index.ts",
                    text: "src/text/index.ts",
                    "text-area": "src/text-area/index.ts",
                    "text-field": "src/text-field/index.ts",
                    tooltip: "src/tooltip/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "react-native"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "ReactNative",
            },
        },
    },
});

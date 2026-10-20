import { createConfig } from "@pureform/vite-config/library";

import packageJson from "./package.json";

export default createConfig({
    package: packageJson,

    overrides: {
        build: {
            lib: {
                entry: {
                    index: "src/index.ts",
                    button: "src/button/index.ts",
                    checkbox: "src/checkbox.ts",
                    switch: "src/switch.ts",
                    "radio-group": "src/radio-group.ts",
                    select: "src/select.ts",
                    menu: "src/menu.ts",
                    dialog: "src/dialog.ts",
                    tooltip: "src/tooltip.ts",
                    presence: "src/presence.ts",
                    tabs: "src/tabs.ts",
                    "button-group": "src/button-group.ts",
                    navigation: "src/navigation/index.ts",
                    snackbar: "src/snackbar/index.ts",
                    ripple: "src/ripple/index.ts",
                    "text-field": "src/text-field/index.ts",
                    slider: "src/slider/index.ts",
                    "tags-input": "src/tags-input/index.ts",
                    toast: "src/toast/index.ts",
                    form: "src/form/index.ts",
                    interaction: "src/interaction/index.ts",
                },
                formats: ["es"],
                fileName: (format, entryName) =>
                    `${entryName || "machines"}.${format === "cjs" ? "cjs" : "mjs"}`,
                name: "Machines",
            },
        },
    },
});

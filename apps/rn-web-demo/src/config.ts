// The demo's pureform config: Material's defaults and a teal theme, and the components the
// React Native adapter covers.

import { materialColor, materialShape } from "@pureform/material";
import { pureform } from "@pureform/preset";

export const config = pureform({
    themes: {
        teal: {
            color: materialColor({ seed: "#006A60" }),
            shape: materialShape({ full: 12 }, { corner: "squircle" }),
        },
    },
});

export const COMPONENTS = [
    "button",
    "card",
    "chip",
    "checkbox",
    "switchControl",
    "text",
    "avatar",
];

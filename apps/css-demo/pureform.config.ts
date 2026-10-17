// The demo's pureform config: Material's defaults, and a teal theme with squircle corners. The
// bundler plugin (and `pureform generate`) write `.pureform/` from it.

import { materialColor, materialShape } from "@pureform/material";
import { pureform } from "@pureform/preset";

export default pureform({
    themes: {
        teal: {
            color: materialColor({ seed: "#006A60" }),
            shape: materialShape({ full: 12 }, { corner: "squircle" }),
        },
    },
});

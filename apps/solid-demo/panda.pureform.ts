// The pureform preset for Panda: the composed pureform config compiled by the Panda adapter.

import { materialColor, materialShape } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { pureform } from "@pureform/preset";
import { roundedShape } from "@pureform/theme";

// The base theme is Material's defaults. Named themes swap some providers and apply inside
// `[data-panda-theme=<name>]`.
const config = pureform({
    themes: {
        teal: {
            color: materialColor({ seed: "#006A60" }),
            shape: materialShape({ full: 12 }),
        },
        sharp: { shape: roundedShape({ base: 0 }) },
    },
});

export const pureformPreset = compilePreset(config, {
    name: "pureform",
    prefix: "pf",
});

// The pureform scrim: a translucent layer that dims what sits behind a modal surface. It stacks
// at the theme's `scrim` layer, under a dialog's, and fades with Zag's `data-state` as a dialog's
// backdrop.

import { typed } from "@pureform/core";
import { absolute, colorMix, px, transparent } from "@pureform/core/ast";
import { opacity, zIndex } from "@pureform/theme";

import { overlayMotion, SCRIM_MOTION } from "./overlay";
import { componentTokens, sys } from "./shared";

const { tokens, ref } = componentTokens("scrim", {
    color: sys("scrim"),
    opacity: opacity("scrim"),
});

const pf = typed();

export const scrim = pf.slotComponent({
    name: "scrim",
    $meta: {
        description:
            "Dims the content behind a modal surface. Place it inside a positioned container.",
    },
    tokens,
    slots: ["root"],
    recipe: () => ({
        base: {
            root: {
                ...overlayMotion(SCRIM_MOTION),
                zIndex: zIndex("scrim"),
                position: absolute,
                top: px(0),
                right: px(0),
                bottom: px(0),
                left: px(0),
                backgroundColor: colorMix(
                    transparent,
                    ref("color"),
                    ref("opacity"),
                ),
            },
        },
    }),
});

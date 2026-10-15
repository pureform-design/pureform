// The pureform scrim: a translucent layer that dims what sits behind a modal surface.

import { defineSlotComponent } from "@pureform/core";
import { absolute, colorMix, px, transparent } from "@pureform/core/ast";
import { opacity } from "@pureform/theme";

import { componentTokens, sys } from "./shared";

const { tokens, ref } = componentTokens("scrim", {
    color: sys("scrim"),
    opacity: opacity("scrim"),
});

export const scrim = defineSlotComponent({
    name: "scrim",
    $meta: {
        description:
            "Dims the content behind a modal surface. Place it inside a positioned container.",
    },
    tokens,
    slots: ["root"],
    recipe: {
        base: {
            root: {
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
    },
});

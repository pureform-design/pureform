// The pureform scrim: a translucent layer that dims what sits behind a modal surface.

import { defineSlotComponent } from "@pureform/core";
import { absolute, alias, colorMix, px, transparent } from "@pureform/core/ast";

import { sys } from "./shared";

export const scrim = defineSlotComponent({
    name: "scrim",
    $meta: {
        description:
            "Dims the content behind a modal surface. Place it inside a positioned container.",
    },
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
                    sys("scrim"),
                    alias("tokens", "opacity", "scrim"),
                ),
            },
        },
    },
});

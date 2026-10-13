// The pureform ripple: the ink that spreads from the press point of an interactive surface.
//
// Only the styles live here. `ripple()` from `@pureform/js-effects` draws each ripple: it finds
// the element marked `data-ripple-layer` inside the pressed surface, appends a ripple element
// sized and positioned from the press, and animates it out. Give the layer the root class and
// pass the ripple class to `ripple()` through its `class` option.

import { defineSlotComponent } from "@pureform/core";
import {
    absolute,
    alias,
    colorMix,
    hidden,
    literal,
    none,
    pct,
    px,
    transparent,
} from "@pureform/core/ast";

import { componentTokens } from "./shared";

const { tokens, ref } = componentTokens("ripple", {
    color: literal("currentColor"),
    opacity: alias("tokens", "opacity", "statePressed"),
});

export const ripple = defineSlotComponent({
    name: "ripple",
    $meta: {
        description:
            "Press ripple. Place the root inside a positioned surface and drive it with ripple() from @pureform/js-effects.",
    },
    tokens,
    slots: ["root", "ripple"],
    recipe: {
        base: {
            root: {
                position: absolute,
                top: px(0),
                right: px(0),
                bottom: px(0),
                left: px(0),
                overflow: hidden,
                borderRadius: literal("inherit"),
                pointerEvents: none,
            },
            ripple: {
                position: absolute,
                borderRadius: pct(50),
                pointerEvents: none,
                backgroundColor: colorMix(
                    transparent,
                    ref("color"),
                    ref("opacity"),
                ),
            },
        },
    },
});

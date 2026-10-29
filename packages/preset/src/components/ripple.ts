// The pureform ripple: the ink that spreads from the press point of an interactive surface.
//
// Only the styles live here. `ripple()` from `@pureform/js-effects` draws each ripple: it finds
// the element marked `data-ripple-layer` inside the pressed surface, appends a ripple element,
// grows it from the press point toward the center while the press lasts, and fades it on
// release. Give the layer the root class and pass the ripple class to `ripple()` through its
// `class` option.
//
// The layer declares the ripple's timing as a transition: `transform` for the grow and
// `opacity` for the fade. The layer never animates either, but `ripple()` reads the computed
// transition at press time, so the motion tokens (or the component tokens) time every ripple.

import { typed } from "@pureform/core";
import {
    absolute,
    alias,
    colorMix,
    hidden,
    literal,
    max,
    none,
    pct,
    px,
    radialGradient,
    stop,
    sub,
    transition,
    transparent,
    tween,
} from "@pureform/core/ast";
import { duration, easing, opacity } from "@pureform/theme";

import { componentTokens } from "./shared";

const { tokens, ref } = componentTokens("ripple", {
    color: literal("currentColor"),
    // A surface supplies its indication here; an explicit ripple opacity still wins.
    surfaceOpacity: opacity("statePressed"),
    opacity: alias("components", "ripple", "surfaceOpacity"),
    growDuration: duration("long1"),
    fadeDuration: duration("medium3"),
    easing: easing("standard"),
});

const pf = typed();

export const ripple = pf.slotComponent({
    name: "ripple",
    $meta: {
        description:
            "Press ripple. Place the root inside a positioned surface and drive it with ripple() from @pureform/js-effects.",
    },
    tokens,
    slots: ["root", "ripple"],
    structure: { root: ["ripple"] },
    recipe: () => ({
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
                transition: transition(
                    tween("transform", ref("growDuration"), ref("easing")),
                    tween("opacity", ref("fadeDuration"), easing("linear")),
                ),
            },
            ripple: {
                position: absolute,
                top: px(0),
                left: px(0),
                borderRadius: pct(50),
                pointerEvents: none,
                // Solid in the middle and fading over the outer 70px (at least the outer 35%),
                // the soft edge Material draws.
                backgroundImage: radialGradient(
                    [
                        stop(
                            colorMix(transparent, ref("color"), ref("opacity")),
                            max(sub(pct(100), px(70)), pct(65)),
                        ),
                        stop(transparent, pct(100)),
                    ],
                    "closest-side",
                ),
            },
        },
    }),
});

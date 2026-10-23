// The pureform fade through: Material's transition between content that isn't spatially related
// (switching navigation destinations). The outgoing page fades out, then the incoming one fades
// in as it grows into place. The bindings keep the outgoing page, marked `data-state="closed"`,
// until its exit ends, over the incoming one, marked `data-state="open"`; the page shown first
// has neither, so it doesn't animate. While a page leaves, the root is `data-transitioning` and
// clips.
//
//   <div class={fadeThrough().root} data-transitioning>
//     <div class={fadeThrough().page} data-state="closed">   (fades out, out of the flow)
//     <div class={fadeThrough().page} data-state="open">     (fades and grows in)
//
// As Compose's `MaterialTransitions.FadeThrough` (androidx-main 62637abaa5): the outgoing page
// fades out linearly (90ms there) as it grows to 105%, and the incoming one fades in linearly
// once it's gone (210ms there) as it grows from 80%. The fades take the theme's `short2` and
// `short4` durations, the incoming one waiting `short2`; the growth runs on the default spatial
// spring (Compose's `scaleIn`/`scaleOut` default spring). Under reduced motion only the fades
// run. React Native runs the same motion from its binding.

import { typed } from "@pureform/core";
import {
    absolute,
    clip,
    none,
    px,
    relative,
    unitless,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";

import { overlayMotion } from "./overlay";
import type { OverlayMotion } from "./overlay";

/** The keyframes the fade through grows its pages with; `pureform()` adds them to the config. */
export const FADE_THROUGH_KEYFRAMES: Record<
    string,
    Record<string, StyleMap>
> = {
    fadeThroughGrowIn: {
        from: { scale: unitless(0.8) },
        to: { scale: unitless(1) },
    },
    fadeThroughGrowOut: {
        from: { scale: unitless(1) },
        to: { scale: unitless(1.05) },
    },
};

/** The incoming page grows from 80% on the default spatial spring as it fades in, after the
 *  outgoing page has faded out; the outgoing page grows to 105% as it fades out. */
export const FADE_THROUGH_MOTION = {
    enter: {
        keyframes: "fadeThroughGrowIn",
        spring: "spatialDefault",
        fade: { duration: "short4", easing: "linear", delay: "short2" },
    },
    exit: {
        keyframes: "fadeThroughGrowOut",
        spring: "spatialDefault",
        fade: { duration: "short2", easing: "linear" },
    },
} as const satisfies OverlayMotion;

const pf = typed();

const motion = overlayMotion(FADE_THROUGH_MOTION).rawRules!.css!;

export const fadeThrough = pf.slotComponent({
    name: "fadeThrough",
    $meta: {
        description:
            "Fades between content that isn't spatially related, such as navigation destinations: the outgoing page fades out, then the incoming one fades and grows in.",
    },
    slots: ["root", "page"],
    structure: { root: ["page"] },
    recipe: () => ({
        base: {
            root: {
                position: relative,
                // While a page leaves, the root clips to the incoming page, so a taller outgoing
                // one doesn't spill past it (Compose's `AnimatedContent` clips by default too);
                // at rest it doesn't, so the content's focus rings and shadows show.
                rawRules: { css: { "&[data-transitioning]": { overflow: clip } } },
            },
            page: {
                rawRules: {
                    css: {
                        ...motion,
                        // The outgoing page leaves the flow, so the incoming one lays out in
                        // its place, and takes no input as it goes.
                        "&[data-state=closed]": {
                            ...motion["&[data-state=closed]"],
                            position: absolute,
                            top: px(0),
                            right: px(0),
                            left: px(0),
                            pointerEvents: none,
                        },
                    },
                },
            },
        },
    }),
});

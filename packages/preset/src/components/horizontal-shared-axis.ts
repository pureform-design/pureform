// The pureform horizontal shared axis: Material's transition between spatially related pages
// (tabs' panels, a stepper's steps, onboarding), as Compose's
// `MaterialTransitions.HorizontalSharedAxis` draws it. The incoming page slides in by a fifth
// of its width from the side the order puts it on and fades in; the outgoing page slides a fifth
// the other way and fades out.
//
// Markup: a root around the pages. The binding keeps the outgoing page until its animations end,
// and marks each page (and the scrim, while a change runs) with where it's going and which way:
//
//   <div class={root}>
//     <div class={page} data-state="leaving" data-direction="forward" inert>…</div>
//     <div class={scrim} data-direction="forward" />             (only with the scrim)
//     <div class={page} data-state="entering" data-direction="forward">…</div>
//   </div>
//
// `forward` goes to a later page: the incoming page comes from the end (the right, or the left
// under right to left) over the outgoing one. `backward` comes from the start, and the
// outgoing page stays on top, as Compose draws its backward transition's target below.
//
// Timing is Compose's: the slide on a spatial spring (the `spatialDefault` role, m1's), the fades
// linear over 90ms after 50ms. Reduced motion drops the slide and keeps the fades.
//
// The scrim (Compose's `MaterialTransitions.scrimColor`) veils the page underneath: the
// outgoing page going forward, which it dims as it fades in, and the incoming page going
// backward, which it lifts off. Its opacity follows the luminance of the theme's surface:
// 0.8 over a dark surface, 0.2 over a light one. It's an option the bindings leave off by
// default: Compose draws this scrim only behind predictive back, which pureform leaves out.

import { typed } from "@pureform/core";
import {
    absolute,
    animation,
    animations,
    clip,
    colorMix,
    easing,
    none,
    numeric,
    pct,
    px,
    relative,
    transform,
    translateX,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap, ValueNode } from "@pureform/core/ast";
import { luminance, resolveColor, spring } from "@pureform/theme";
import type { ColorContract, Scheme } from "@pureform/theme";

import { componentTokens, isolated, sys } from "./shared";

/** Compose's veil opacities: over a light surface, and over a dark one (luminance under 0.5). */
export const SHARED_AXIS_SCRIM_OPACITY = { light: 0.2, dark: 0.8 } as const;

/** The scrim's opacity over a surface of this luminance, as Compose chooses it. */
export const sharedAxisScrimOpacity = (surfaceLuminance: number): number =>
    surfaceLuminance < 0.5
        ? SHARED_AXIS_SCRIM_OPACITY.dark
        : SHARED_AXIS_SCRIM_OPACITY.light;

// The opacity in each scheme from the surface's luminance there, or the scheme's own when the
// surface isn't a plain color.
const scrimOpacityOf = (
    color: Pick<ColorContract<string>, "roles" | "primitives"> | undefined,
): ValueNode => {
    const at = (scheme: Scheme) => {
        const surface =
            color && resolveColor(color, color.roles["surface"], scheme);
        const lum = surface && luminance(surface);
        return lum === undefined
            ? SHARED_AXIS_SCRIM_OPACITY[scheme]
            : sharedAxisScrimOpacity(lum);
    };
    const light = at("light");
    const dark = at("dark");
    // A share of the scrim color, as `colorMix` takes it.
    const share = (opacity: number) => pct(Math.round(opacity * 100));
    return light === dark
        ? share(light)
        : when("dark", share(dark), share(light));
};

const FADE_IN = "overlayFadeIn";
const FADE_OUT = "overlayFadeOut";

// How far a page slides: a fifth of its own width (Compose's `SlideFraction`).
const SLIDE = 20;

const at = (x: number): StyleMap => ({
    transform: transform(translateX(x === 0 ? px(0) : pct(x))),
});

/** The keyframes the shared axis slides with, physical (right to left picks the mirrored
 *  ones); `pureform()` adds them to the config. The fades are the overlays'. */
export const SHARED_AXIS_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    sharedAxisFromRight: { from: at(SLIDE), to: at(0) },
    sharedAxisFromLeft: { from: at(-SLIDE), to: at(0) },
    sharedAxisToLeft: { from: at(0), to: at(-SLIDE) },
    sharedAxisToRight: { from: at(0), to: at(SLIDE) },
};

type Way = "forward" | "backward";
type Going = "entering" | "leaving";

// Physically, where each page slides under left to right; right to left mirrors it.
const SLIDES: Record<
    Going,
    Record<Way, readonly [ltr: string, rtl: string]>
> = {
    entering: {
        forward: ["sharedAxisFromRight", "sharedAxisFromLeft"],
        backward: ["sharedAxisFromLeft", "sharedAxisFromRight"],
    },
    leaving: {
        forward: ["sharedAxisToLeft", "sharedAxisToRight"],
        backward: ["sharedAxisToRight", "sharedAxisToLeft"],
    },
};

const pf = typed();

/** Build the horizontal shared axis. `color` is the theme's color contract, whose surface sets
 *  the scrim's opacity in light and dark; without it, light schemes take 0.2 and dark 0.8. */
export const createHorizontalSharedAxis = (
    color?: Pick<ColorContract<string>, "roles" | "primitives">,
) => {
    const { tokens, ref } = componentTokens("horizontalSharedAxis", {
        slideSpring: spring("spatialDefault"),
        // Compose's `FadeAnimationSpec`: linear, 90ms, after 50ms, in and out.
        fadeDuration: numeric(90, "ms"),
        fadeDelay: numeric(50, "ms"),
        scrimColor: sys("scrim"),
        scrimOpacity: scrimOpacityOf(color),
    });

    // The entering page waits its delay unseen (`both`); the leaving one holds its last frame
    // until the binding removes it.
    const fade = (going: Going) =>
        animation({
            name: going === "entering" ? FADE_IN : FADE_OUT,
            duration: ref("fadeDuration"),
            delay: ref("fadeDelay"),
            easing: easing("linear"),
            fillMode: going === "entering" ? "both" : "forwards",
        });
    const slide = (name: string, going: Going) =>
        animation({
            name,
            spring: ref("slideSpring"),
            ...(going === "leaving" ? { fillMode: "forwards" as const } : {}),
        });
    const motion = (going: Going, way: Way) => {
        const [ltr, rtl] = SLIDES[going][way];
        return when()
            .on("rtl", animations(slide(rtl, going), fade(going)))
            .on("reducedMotion", fade(going))
            .else(animations(slide(ltr, going), fade(going)));
    };
    const pageRules: Record<string, StyleMap> = {};
    for (const going of ["entering", "leaving"] as const) {
        for (const way of ["forward", "backward"] as const) {
            pageRules[`&[data-state=${going}][data-direction=${way}]`] = {
                animation: motion(going, way),
                // Forward, the incoming page draws over the outgoing; backward, under it.
                zIndex: unitless(
                    (going === "entering") === (way === "forward") ? 2 : 0,
                ),
            };
        }
    }
    // The leaving page keeps its place over the incoming one, which sets the root's size.
    pageRules["&[data-state=leaving]"] = {
        position: absolute,
        top: px(0),
        right: px(0),
        bottom: px(0),
        left: px(0),
    };

    // The scrim dims the page going under as it fades in (forward), and lifts off the page
    // coming from under (backward), over the slide's time.
    const scrimRun = (way: Way) =>
        animation({
            name: way === "forward" ? FADE_IN : FADE_OUT,
            spring: ref("slideSpring"),
            fillMode: "both",
        });

    return pf.slotComponent({
        name: "horizontalSharedAxis",
        $meta: {
            description:
                "Slides and fades between spatially related pages, such as tabs' panels or a stepper's steps.",
        },
        tokens,
        slots: ["root", "page", "scrim"],
        structure: { root: ["page", "scrim"] },
        recipe: () => ({
            base: {
                root: {
                    ...isolated,
                    position: relative,
                    overflow: clip,
                },
                page: {
                    position: relative,
                    rawRules: { css: pageRules },
                },
                scrim: {
                    position: absolute,
                    top: px(0),
                    right: px(0),
                    bottom: px(0),
                    left: px(0),
                    zIndex: unitless(1),
                    pointerEvents: none,
                    backgroundColor: colorMix(
                        transparent,
                        ref("scrimColor"),
                        ref("scrimOpacity"),
                    ),
                    rawRules: {
                        css: {
                            "&[data-direction=forward]": {
                                animation: scrimRun("forward"),
                            },
                            "&[data-direction=backward]": {
                                animation: scrimRun("backward"),
                            },
                        },
                    },
                },
            },
        }),
    });
};

export const horizontalSharedAxis = createHorizontalSharedAxis();

// The pureform progress indicators: Material's linear and circular progress.
//
// Both read their value from the `value` token, a CSS var the app sets as a number from 0 to
// 100 (`--components-linearProgress-value: 40`), alongside `aria-valuenow` on the element
// with `role="progressbar"`. Turn on `indeterminate` when the amount is unknown: the linear
// indicator then slides along its track, and the circular one spins.
//
//   <div class={root} role="progressbar" aria-valuenow="40" style="--components-linearProgress-value: 40">
//     <div class={track} />
//     <div class={indicator} />
//     <div class={stopIndicator} />
//   </div>
//
//   <div class={root} role="progressbar" aria-valuenow="40" style="--components-circularProgress-value: 40">
//     <span class={track}>
//       <span class={trackEndHalf}><span class={trackEndArc} /></span>
//       <span class={trackStartHalf}><span class={trackStartArc} /></span>
//     </span>
//     <span class={endHalf}><span class={endArc} /></span>
//     <span class={startHalf}><span class={startArc} /></span>
//   </div>
//
// `shape: wavy` (M3 Expressive) draws the indicator as a wave: it is clipped to a band along a
// sine wave (`waveBand`, `wavyRing`), and the track stays flat. The wave's points read the
// thickness and `amplitude` tokens, so it follows them with no compound per thickness. Where a
// target can't clip to a shape, the indicator stays flat.
//
// A determinate indicator leaves a gap between its active part and its track (the `gap` token:
// a length on the linear one, a share of the circle on the circular one). The track draws from
// where the gap ends to where it begins again, so it never sits under the indicator.

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    animation,
    clamp,
    div,
    hidden,
    max,
    min,
    mul,
    none,
    numeric,
    pct,
    px,
    relative,
    rotate,
    solid,
    sub,
    transform,
    translateX,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ShapeNode, StyleMap } from "@pureform/core/ast";
import { easing, radius } from "@pureform/theme";

import { waveBand, wavyRing } from "./shape-paths";
import {
    DEFAULT_GROUP,
    circle,
    colorVariant,
    componentTokens,
    defaultGroups,
    sys,
    tweens,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const pf = typed();

// One wave of the wavy line, in px: Compose's `WavyProgressIndicatorDefaults` 40dp wavelength.
const WAVELENGTH = 40;
const WAVE_DRIFT = "components.linearProgress.waveDrift";
const SLIDE = "components.linearProgress.slide";
const CIRCULAR_VALUE = "components.circularProgress.value";

// Compose's indeterminate circular arc grows from a tenth of the circle to 87% and shrinks back
// (`CircularIndeterminateMinProgress`, `CircularIndeterminateMaxProgress`) while the whole turns.
// Here a cycle is two turns: as the arc grows, its tail turns 221.4°; as it shrinks, the tail
// catches up by the 277.2° the arc gave up as well, so the head keeps going round and a cycle
// ends two turns on, where the next begins. Mirrored under right to left, where the arcs are.
const ARC_MIN = 10;
const ARC_MAX = 87;
const CATCH_UP = (ARC_MAX - ARC_MIN) * 3.6;
const HALFWAY = (720 - CATCH_UP) / 2;

function circularArcKeyframes(): Record<string, Record<string, StyleMap>> {
    const frames = (sign: 1 | -1) => ({
        "0%": {
            transform: transform(rotate(numeric(0, "deg"))),
            tokens: { [CIRCULAR_VALUE]: unitless(ARC_MIN) },
        },
        "50%": {
            transform: transform(rotate(numeric(sign * HALFWAY, "deg"))),
            tokens: { [CIRCULAR_VALUE]: unitless(ARC_MAX) },
        },
        "100%": {
            transform: transform(rotate(numeric(sign * 720, "deg"))),
            tokens: { [CIRCULAR_VALUE]: unitless(ARC_MIN) },
        },
    });
    return {
        circularProgressArc: frames(1),
        circularProgressArcRtl: frames(-1),
    };
}

/** The keyframes the progress indicators animate with; `pureform()` adds them to the
 *  config. */
export const PROGRESS_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    // The indicator enters from the start and leaves past the end; translate is relative to
    // its own width, a fraction of the track's. Translation is physical, so right to left
    // runs the other way.
    // `slide` says the same in the indicator's widths, so a wavy indicator's clip can undo it.
    linearProgressSlide: {
        from: {
            transform: transform(translateX(pct(-100))),
            tokens: { [SLIDE]: unitless(-1) },
        },
        to: {
            transform: transform(translateX(pct(250))),
            tokens: { [SLIDE]: unitless(2.5) },
        },
    },
    linearProgressSlideRtl: {
        from: {
            transform: transform(translateX(pct(100))),
            tokens: { [SLIDE]: unitless(1) },
        },
        to: {
            transform: transform(translateX(pct(-250))),
            tokens: { [SLIDE]: unitless(-2.5) },
        },
    },
    // A wavy line's wave travels along its track, a wavelength each cycle, toward the end.
    linearProgressWave: {
        from: { tokens: { [WAVE_DRIFT]: px(0) } },
        to: { tokens: { [WAVE_DRIFT]: px(WAVELENGTH) } },
    },
    linearProgressWaveRtl: {
        from: { tokens: { [WAVE_DRIFT]: px(WAVELENGTH) } },
        to: { tokens: { [WAVE_DRIFT]: px(0) } },
    },
    ...circularArcKeyframes(),
};

const linear = componentTokens(
    "linearProgress",
    {
        activeColor: sys("primary"),
        trackColor: sys("secondaryContainer"),
        height: px(4),
        thickHeight: px(8),
        value: unitless(0),
        indeterminateWidth: pct(40),
        gap: px(4),
        stopSize: px(4),
        // How far a wavy indicator's wave moves above and below the track's line.
        amplitude: px(3),
        // One indeterminate cycle: Compose's `LinearAnimationDuration`, 1750ms.
        indeterminateDuration: numeric(1750, "ms"),
        // How long the wave takes to travel a wavelength: Compose's `waveSpeed`, a wavelength a
        // second.
        waveDuration: numeric(1000, "ms"),
        // How far the wave has travelled, which the indeterminate wave animates.
        waveDrift: px(0),
        // How far the indeterminate indicator has slid, in its own widths.
        slide: unitless(0),
    },
    { waveDrift: "length", slide: "number" },
);

// The linear wave: 40px long, as many as cover a 960px bar (a longer one ends flat), in a box as
// tall as the track and the wave's amplitude above and below it, from the tokens, so it follows
// the thickness and the amplitude.
const linearWave = waveBand({
    waves: 24,
    wavelength: 40,
    top: linear.ref("amplitude"),
    bottom: add(linear.ref("amplitude"), linear.ref("height")),
    amplitude: linear.ref("amplitude"),
});

// The indeterminate wave: the same band, anchored to the track rather than the sliding bar, a
// wave longer so it can travel a wavelength. The indicator clips to it, shifted back by however
// far it has slid (`slide` of its own widths), so the wave stays where it is on the track while
// the bar moves under it, and the flat track isn't clipped.
const travellingWave = (): ShapeNode =>
    waveBand({
        waves: 25,
        wavelength: WAVELENGTH,
        top: linear.ref("amplitude"),
        bottom: add(linear.ref("amplitude"), linear.ref("height")),
        amplitude: linear.ref("amplitude"),
        shift: sub(
            sub(linear.ref("waveDrift"), px(WAVELENGTH)),
            mul(linear.ref("slide"), pct(100)),
        ),
    });

const travel = (name: string) =>
    animation({
        name,
        duration: linear.ref("waveDuration"),
        easing: easing("linear"),
        iterations: "infinite",
    });

const slide = (name: string) =>
    animation({
        name,
        duration: linear.ref("indeterminateDuration"),
        easing: easing("standard"),
        iterations: "infinite",
    });

/** Build the linear progress indicator with a `color` variant per group in `groups`. */
export const createLinearProgress = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) => {
    const { ref } = linear;
    return variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "linearProgress",
            $meta: {
                description:
                    "Material linear progress. Set the value token (0 to 100), or turn on indeterminate.",
            },
            tokens: linear.tokens,
            slots: ["root", "track", "indicator", "stopIndicator"],
            structure: { root: ["track", "indicator", "stopIndicator"] },
            variants: {
                indeterminate: ["true", "false"],
                thickness: ["default", "thick"],
                shape: ["flat", "wavy"],
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: {
                    root: {
                        position: relative,
                        overflow: hidden,
                        width: pct(100),
                        height: ref("height"),
                    },
                    // The track starts after the indicator and the gap, and ends at the root's
                    // end. At a full value its start passes its end and nothing shows.
                    track: {
                        position: absolute,
                        top: px(0),
                        height: pct(100),
                        insetInlineStart: add(
                            mul(ref("value"), pct(1)),
                            ref("gap"),
                        ),
                        insetInlineEnd: px(0),
                        borderRadius: radius("full"),
                        backgroundColor: ref("trackColor"),
                        transition: tweens("insetInlineStart"),
                    },
                    // The dot at the end of a determinate track, centred on it.
                    stopIndicator: {
                        position: absolute,
                        insetInlineEnd: px(0),
                        top: div(
                            sub(ref("height"), ref("stopSize")),
                            unitless(2),
                        ),
                        width: ref("stopSize"),
                        height: ref("stopSize"),
                        borderRadius: circle,
                        backgroundColor: ref("activeColor"),
                    },
                    indicator: {
                        position: absolute,
                        top: px(0),
                        insetInlineStart: px(0),
                        height: pct(100),
                        width: mul(ref("value"), pct(1)),
                        borderRadius: radius("full"),
                        backgroundColor: ref("activeColor"),
                        transition: tweens("width"),
                    },
                },
                variants: {
                    indeterminate: {
                        true: {
                            track: { insetInlineStart: px(0) },
                            stopIndicator: { display: none },
                            indicator: {
                                width: ref("indeterminateWidth"),
                                animation: when(
                                    "rtl",
                                    slide("linearProgressSlideRtl"),
                                    slide("linearProgressSlide"),
                                ),
                            },
                        },
                        false: {},
                    },
                    // M3 Expressive's thick track.
                    thickness: {
                        default: {},
                        thick: {
                            root: { tokens: { height: ref("thickHeight") } },
                        },
                    },
                    // M3 Expressive's wavy indicator: the bar grows by the wave's amplitude
                    // above and below, the track and the dot stay on its middle line, and the
                    // indicator fills the bar's height, clipped to the wave.
                    shape: {
                        flat: {},
                        wavy: {
                            root: {
                                height: add(
                                    ref("height"),
                                    mul(ref("amplitude"), unitless(2)),
                                ),
                            },
                            track: {
                                top: ref("amplitude"),
                                height: ref("height"),
                            },
                            stopIndicator: {
                                top: add(
                                    ref("amplitude"),
                                    div(
                                        sub(ref("height"), ref("stopSize")),
                                        unitless(2),
                                    ),
                                ),
                            },
                            indicator: {
                                top: when("clipShape", px(0), ref("amplitude")),
                                height: when(
                                    "clipShape",
                                    pct(100),
                                    ref("height"),
                                ),
                                borderRadius: when(
                                    "clipShape",
                                    px(0),
                                    radius("full"),
                                ),
                                clipPath: linearWave,
                            },
                        },
                    },
                    color: colorVariant(groups, (g) => ({
                        track: { backgroundColor: g.container },
                        indicator: { backgroundColor: g.main },
                        stopIndicator: { backgroundColor: g.main },
                    })),
                },
                // The indeterminate wave travels along the track, not with the bar (Compose's
                // `LinearWavyProgressIndicator`): on the web the root animates the wave's drift
                // and the bar, filling its height, clips to the wave where it is on the track. React Native keeps the bar's own wave.
                compoundVariants: [
                    {
                        match: { shape: "wavy", indeterminate: "true" },
                        style: {
                            root: {
                                rawRules: {
                                    css: {
                                        "&": {
                                            animation: when(
                                                "rtl",
                                                travel("linearProgressWaveRtl"),
                                                travel("linearProgressWave"),
                                            ),
                                        },
                                    },
                                },
                            },
                            indicator: {
                                rawRules: {
                                    css: {
                                        "&": {
                                            clipPath: travellingWave(),
                                            top: px(0),
                                            height: pct(100),
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
                defaultVariants: {
                    indeterminate: "false",
                    thickness: "default",
                    shape: "flat",
                    color: DEFAULT_GROUP,
                },
            }),
        }),
    );
};

export const linearProgress = createLinearProgress();

// The value is a number that transitions, so both halves' arcs draw from one moving value
// and meet at every frame; turning each arc on its own transition would open a gap between
// them.
const circular = componentTokens(
    "circularProgress",
    {
        activeColor: sys("primary"),
        trackColor: sys("secondaryContainer"),
        size: px(48),
        thickness: px(4),
        value: unitless(0),
        gap: unitless(3),
        // How far a wavy indicator's wave moves in and out of its circle.
        amplitude: px(1.5),
        // One indeterminate turn: Compose's indicator turns 1080° in its 6000ms cycle and
        // steps another 360° (`CircularGlobalRotationDegreesTarget`,
        // `CircularAdditionalRotationDegreesTarget`), 1500ms a turn on average.
        rotationDuration: numeric(1500, "ms"),
    },
    { value: "number" },
);

// The circular wave: nine waves around the circle, from the tokens, so it follows the thickness
// and the amplitude.
const circularWave = wavyRing({
    waves: 9,
    thickness: circular.ref("thickness"),
    amplitude: circular.ref("amplitude"),
});

const DEG_PER_PERCENT = numeric(3.6, "deg");

/** Build the circular progress indicator with a `color` variant per group in `groups`. */
export const createCircularProgress = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) => {
    const { ref } = circular;

    // A half of the circle, clipping a ring whose two colored sides make a half-circle arc.
    // The ring turns from `start` by `sweep`: hidden at 0, filling its half at 180 degrees.
    const half = (side: "Start" | "End"): StyleMap => ({
        position: absolute,
        top: px(0),
        [`insetInline${side}`]: px(0),
        width: pct(50),
        height: pct(100),
        overflow: hidden,
    });
    const arc = (
        side: "Start" | "End",
        start: number,
        sweep: ReturnType<typeof min>,
        color: ReturnType<typeof ref>,
    ): StyleMap => {
        const turn = add(numeric(start, "deg"), mul(sweep, DEG_PER_PERCENT));
        return {
            position: absolute,
            top: px(0),
            [`insetInline${side}`]: px(0),
            width: pct(200),
            height: pct(100),
            borderRadius: circle,
            borderStyle: solid,
            borderWidth: ref("thickness"),
            borderColor: transparent,
            borderBlockStartColor: color,
            borderInlineEndColor: color,
            // Turned the other way under right to left, where the ring is mirrored.
            transform: when(
                "rtl",
                transform(rotate(mul(turn, unitless(-1)))),
                transform(rotate(turn)),
            ),
            // Hidden until it has a share to show, so its anti-aliased edge never shows at the seam.
            opacity: clamp(unitless(0), sweep, unitless(1)),
        };
    };

    // A cycle of the indeterminate arc: two turns.
    const spin = (name: string) =>
        animation({
            name,
            duration: mul(ref("rotationDuration"), unitless(2)),
            easing: easing("standard"),
            iterations: "infinite",
        });

    // A ring as wide as the wave, clipped to it.
    const wavyArc: StyleMap = {
        borderWidth: add(ref("thickness"), mul(ref("amplitude"), unitless(2))),
        clipPath: circularWave,
    };

    // The track is the same two-half ring, turned to where the gap after the indicator ends and
    // drawing what is left of the circle less a gap at each end (in percent of the circle).
    const trackTurn = add(ref("value"), ref("gap"));
    const left = max(
        sub(unitless(100), ref("value"), mul(ref("gap"), unitless(2))),
        unitless(0),
    );

    return pf.slotComponent({
        name: "circularProgress",
        $meta: {
            description:
                "Material circular progress. Set the value token (0 to 100), or turn on indeterminate for a spinner.",
        },
        tokens: circular.tokens,
        slots: [
            "root",
            "track",
            "trackEndHalf",
            "trackEndArc",
            "trackStartHalf",
            "trackStartArc",
            "endHalf",
            "endArc",
            "startHalf",
            "startArc",
        ],
        structure: {
            root: ["track", "endHalf", "startHalf"],
            track: ["trackEndHalf", "trackStartHalf"],
            trackEndHalf: ["trackEndArc"],
            trackStartHalf: ["trackStartArc"],
            endHalf: ["endArc"],
            startHalf: ["startArc"],
        },
        variants: {
            indeterminate: ["true", "false"],
            thickness: ["default", "thick"],
            shape: ["flat", "wavy"],
            color: groups as ColorGroups,
        },
        recipe: () => ({
            base: {
                root: {
                    position: relative,
                    width: ref("size"),
                    height: ref("size"),
                    borderRadius: circle,
                    transition: tweens(circular.own("value")),
                },
                // The end half shows the first 50%, the start half the rest.
                track: {
                    position: absolute,
                    top: px(0),
                    insetInlineStart: px(0),
                    width: pct(100),
                    height: pct(100),
                    // Turned the other way under right to left, which mirrors the circle.
                    transform: when(
                        "rtl",
                        transform(rotate(mul(trackTurn, numeric(-3.6, "deg")))),
                        transform(rotate(mul(trackTurn, DEG_PER_PERCENT))),
                    ),
                    transition: tweens(circular.own("value")),
                },
                trackEndHalf: half("End"),
                trackEndArc: arc(
                    "End",
                    -135,
                    min(left, unitless(50)),
                    ref("trackColor"),
                ),
                trackStartHalf: half("Start"),
                trackStartArc: arc(
                    "Start",
                    45,
                    max(sub(left, unitless(50)), unitless(0)),
                    ref("trackColor"),
                ),
                endHalf: half("End"),
                endArc: arc(
                    "End",
                    -135,
                    min(ref("value"), unitless(50)),
                    ref("activeColor"),
                ),
                startHalf: half("Start"),
                startArc: arc(
                    "Start",
                    45,
                    max(sub(ref("value"), unitless(50)), unitless(0)),
                    ref("activeColor"),
                ),
            },
            variants: {
                // The determinate arcs, turning, their length growing from a tenth of the
                // circle to 87% and back (`circularProgressArc`, which animates `value`; a
                // target that can't animate a token keeps half the circle).
                indeterminate: {
                    true: {
                        root: {
                            tokens: { value: unitless(50) },
                            animation: when(
                                "rtl",
                                spin("circularProgressArcRtl"),
                                spin("circularProgressArc"),
                            ),
                        },
                        track: { display: none },
                    },
                    false: {},
                },
                // M3 Expressive's thick track: every ring takes the thick width.
                thickness: {
                    default: {},
                    thick: {
                        root: { tokens: { thickness: px(8) } },
                    },
                },
                // M3 Expressive's wavy indicator: each arc's ring is as wide as the wave and
                // clipped to it, and the flat track sits on the wave's middle line.
                shape: {
                    flat: {},
                    wavy: {
                        track: {
                            top: ref("amplitude"),
                            insetInlineStart: ref("amplitude"),
                            width: sub(
                                pct(100),
                                mul(ref("amplitude"), unitless(2)),
                            ),
                            height: sub(
                                pct(100),
                                mul(ref("amplitude"), unitless(2)),
                            ),
                        },
                        endArc: wavyArc,
                        startArc: wavyArc,
                    },
                },
                // The arcs and the spinning ring read these, so the color doesn't set the
                // ring's sides itself (which would overlap `indeterminate`'s).
                color: colorVariant(groups, (g) => ({
                    root: {
                        tokens: {
                            activeColor: g.main,
                            trackColor: g.container,
                        },
                    },
                })),
            },
            defaultVariants: {
                indeterminate: "false",
                thickness: "default",
                shape: "flat",
                color: DEFAULT_GROUP,
            },
        }),
    });
};

export const circularProgress = createCircularProgress();

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
//       <span class={trackTailCap} /><span class={trackHeadCap} />
//     </span>
//     <span class={endHalf}><span class={endArc} /></span>
//     <span class={startHalf}><span class={startArc} /></span>
//     <span class={tailCap} /><span class={headCap} />
//   </div>
//
// `shape: wavy` (M3 Expressive) draws the indicator as a wave: it is clipped to a band along a
// sine wave (`waveBand`, `wavyRing`), and the track stays flat. The wave's points read the
// thickness and `amplitude` tokens, so it follows them with no compound per thickness. Where a
// target can't clip to a shape, the indicator stays flat.
//
// A determinate indicator leaves a gap between its active part and its track (the `gap` token,
// a length). The track draws from where the gap ends to where it begins again, so it never sits
// under the indicator. The circular one turns the gap into an angle from its size and thickness
// (`asin`, `ratio`), so it stays the same length however big or thick the circle is.

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    alias,
    animation,
    asin,
    clamp,
    div,
    flex,
    hidden,
    max,
    min,
    mul,
    none,
    numeric,
    pct,
    platform,
    px,
    ratio,
    relative,
    rotate,
    sin,
    solid,
    sub,
    transform,
    translateX,
    translateY,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { NumericValue, ShapeNode, StyleMap } from "@pureform/core/ast";
import { easing, radius } from "@pureform/theme";

import { waveBand, wavyArc as wavyArcPath, wavyRing } from "./shape-paths";
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

// How far the indeterminate track's parts have moved: `from` to `to` indicator widths.
function trackSlide(sign: 1 | -1): Record<string, StyleMap> {
    const at = (widths: number) =>
        transform(
            translateX(
                mul(
                    unitless(sign * widths),
                    alias("components", "linearProgress", "indeterminateWidth"),
                ),
            ),
        );
    return { from: { transform: at(-1) }, to: { transform: at(2.5) } };
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
        // The band itself is mirrored, so increasing logical drift moves physically left.
        from: { tokens: { [WAVE_DRIFT]: px(0) } },
        to: { tokens: { [WAVE_DRIFT]: px(WAVELENGTH) } },
    },
    ...circularArcKeyframes(),
    // The indeterminate track's two parts move with the indicator: as far, in the root's widths
    // (theirs), as the indicator's `linearProgressSlide` moves it in its own.
    linearProgressTrack: trackSlide(1),
    linearProgressTrackRtl: trackSlide(-1),
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

// The travelling wave: the same band, anchored to the track rather than the sliding bar, a
// wave longer so it can travel a wavelength. The indicator clips to it, shifted back by however
// far it has slid (`slide` of its own widths), so the wave stays where it is on the track while
// the bar moves under it, and the flat track isn't clipped.
const travellingWave = (mirrored = false): ShapeNode =>
    waveBand({
        waves: 25,
        wavelength: WAVELENGTH,
        top: linear.ref("amplitude"),
        bottom: add(linear.ref("amplitude"), linear.ref("height")),
        amplitude: linear.ref("amplitude"),
        mirrored,
        shift: sub(
            sub(linear.ref("waveDrift"), px(WAVELENGTH)),
            mul(linear.ref("slide"), pct(mirrored ? -100 : 100)),
        ),
    });

// A part of the indeterminate track, as wide as the track, starting at `start` (where it would be
// with the indicator at the track's start), and moving with the indicator.
const trackPart = (start: ReturnType<typeof add>): StyleMap => ({
    display: flex,
    position: absolute,
    top: px(0),
    height: pct(100),
    width: pct(100),
    insetInlineStart: start,
    borderRadius: radius("full"),
    backgroundColor: linear.ref("trackColor"),
    animation: when(
        "rtl",
        slide("linearProgressTrackRtl"),
        slide("linearProgressTrack"),
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
            slots: [
                "root",
                "track",
                "trackBefore",
                "trackAfter",
                "indicator",
                "stopIndicator",
            ],
            structure: {
                root: ["track", "indicator", "stopIndicator"],
                track: ["trackBefore", "trackAfter"],
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
                        overflow: hidden,
                        transition: tweens("insetInlineStart"),
                    },
                    // The indeterminate track's parts before and after the sliding indicator
                    // (none while determinate).
                    trackBefore: { display: none },
                    trackAfter: { display: none },
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
                            // The track is drawn in two parts, one either side of the
                            // sliding indicator and its gaps, each with rounded ends (Compose's
                            // indeterminate track); the track only clips them to its own
                            // rounded ends. Each part is as wide as the track and moves with the
                            // indicator (`linearProgressTrack`).
                            track: {
                                insetInlineStart: px(0),
                                backgroundColor: transparent,
                            },
                            trackBefore: trackPart(sub(pct(-100), ref("gap"))),
                            trackAfter: trackPart(
                                add(ref("indeterminateWidth"), ref("gap")),
                            ),
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
                                rawRules: {
                                    css: {
                                        "&": {
                                            animation: when(
                                                "reducedMotion",
                                                none,
                                                when(
                                                    "rtl",
                                                    travel(
                                                        "linearProgressWaveRtl",
                                                    ),
                                                    travel(
                                                        "linearProgressWave",
                                                    ),
                                                ),
                                            ),
                                        },
                                    },
                                },
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
                                rawRules: {
                                    css: {
                                        "&": {
                                            clipPath: when(
                                                "rtl",
                                                travellingWave(true),
                                                travellingWave(),
                                            ),
                                            top: px(0),
                                            height: pct(100),
                                        },
                                    },
                                },
                            },
                        },
                    },
                    // The track's color through its token, which the indeterminate track's
                    // gradient reads too.
                    color: colorVariant(groups, (g) => ({
                        root: { tokens: { trackColor: g.container } },
                        indicator: { backgroundColor: g.main },
                        stopIndicator: { backgroundColor: g.main },
                    })),
                },
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
        // The space between the indicator's rounded ends and the track's, at every size and
        // thickness.
        gap: px(4),
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
// and the amplitude. Each half clips to its share of one wave fixed in the circle's frame, so the
// halves' waves meet at the seam however far their arcs have turned. Right to left mirrors it
// with the circle.
const circularWave = (half: "left" | "right", mirrored = false) =>
    wavyRing({
        waves: 9,
        thickness: circular.ref("thickness"),
        amplitude: circular.ref("amplitude"),
        half,
        mirrored,
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
    // `sweep` is an angle; `shown` a number that is 0 while the arc has no length.
    const arc = (
        side: "Start" | "End",
        start: number,
        sweep: NumericValue,
        shown: NumericValue,
        color: ReturnType<typeof ref>,
    ): StyleMap => {
        const turn = add(numeric(start, "deg"), sweep);
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
            opacity: clamp(unitless(0), shown, unitless(1)),
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

    // A ring as wide as the wave; its half clips it to the wave. The half on the end side is the
    // right one, or the left one under right to left.
    const wavyArc: StyleMap = {
        borderWidth: add(ref("thickness"), mul(ref("amplitude"), unitless(2))),
    };
    const wavyHalf = (side: "Start" | "End"): StyleMap => ({
        clipPath: when(
            "rtl",
            platform(
                { css: circularWave(side === "End" ? "left" : "right", true) },
                nativeWave(true),
            ),
            platform(
                { css: circularWave(side === "End" ? "right" : "left") },
                nativeWave(false),
            ),
        ),
    });

    const nativeWave = (rtl: boolean) =>
        wavyArcPath({
            waves: 9,
            thickness: ref("thickness"),
            amplitude: ref("amplitude"),
            sweep: mul(ref("value"), DEG_PER_PERCENT),
            mirrored: rtl,
        });

    const valueTurn = mul(ref("value"), DEG_PER_PERCENT);
    const degrees = (n: number) => numeric(n, "deg");

    // A rounded end: a dot as wide as the ring, centred in its box, turned to `at` (an angle
    // clockwise from the top) and moved out to the ring's middle line (`inset` in from the box's
    // edge, left to right and right to left), shown only while its arc has a length (`shown`).
    const cap = (
        at: NumericValue,
        color: ReturnType<typeof ref>,
        shown: NumericValue,
        inset: (rtl: boolean) => NumericValue = () => px(0),
    ): StyleMap => {
        const out = (rtl: boolean) =>
            translateY(
                mul(
                    div(
                        sub(
                            ref("size"),
                            ref("thickness"),
                            mul(inset(rtl), unitless(2)),
                        ),
                        unitless(2),
                    ),
                    unitless(-1),
                ),
            );
        return {
            position: absolute,
            top: sub(pct(50), div(ref("thickness"), unitless(2))),
            insetInlineStart: sub(pct(50), div(ref("thickness"), unitless(2))),
            width: ref("thickness"),
            height: ref("thickness"),
            borderRadius: circle,
            backgroundColor: color,
            transform: when(
                "rtl",
                transform(rotate(mul(at, unitless(-1))), out(true)),
                transform(rotate(at), out(false)),
            ),
            opacity: clamp(unitless(0), shown, unitless(1)),
        };
    };

    // The track is the same two-half ring, turned to where the gap after the indicator ends and
    // drawing what is left of the circle. Every arc's ends are rounded by a dot centred on each,
    // so neighbouring ends' centres sit `gap + thickness` apart (a chord of the ring's middle
    // line, `inset` in from the box's edge): `2 × asin((gap + thickness) / across)` apart, where
    // `across` is the middle line's diameter. That follows the size, thickness and gap as an
    // app or instance sets them, so the gap stays `gap` long. `ratio` divides the two lengths
    // where CSS can't.
    const trackParts = (inset: NumericValue) => {
        const apart = mul(
            asin(
                ratio(
                    add(ref("gap"), ref("thickness")),
                    sub(ref("size"), ref("thickness"), mul(inset, unitless(2))),
                ),
            ),
            unitless(2),
        );
        const turn = add(valueTurn, apart);
        const left = max(
            sub(degrees(360), valueTurn, mul(apart, unitless(2))),
            degrees(0),
        );
        // A number that is 0 while an angle is, and 1 from about a degree on.
        const shownFor = (angle: NumericValue) =>
            mul(sin(min(angle, degrees(90))), unitless(64));
        const endSweep = min(left, degrees(180));
        const startSweep = max(sub(left, degrees(180)), degrees(0));
        const capInset = () => inset;
        return {
            // Turned the other way under right to left, which mirrors the circle.
            track: {
                transform: when(
                    "rtl",
                    transform(rotate(mul(turn, unitless(-1)))),
                    transform(rotate(turn)),
                ),
            },
            trackEndArc: arc(
                "End",
                -135,
                endSweep,
                shownFor(endSweep),
                ref("trackColor"),
            ),
            trackStartArc: arc(
                "Start",
                45,
                startSweep,
                shownFor(startSweep),
                ref("trackColor"),
            ),
            // The track's ends: where it starts and where what it draws ends.
            trackTailCap: cap(
                degrees(0),
                ref("trackColor"),
                shownFor(left),
                capInset,
            ),
            trackHeadCap: cap(
                left,
                ref("trackColor"),
                shownFor(left),
                capInset,
            ),
        } satisfies Record<string, StyleMap>;
    };
    const flatTrack = trackParts(px(0));
    // The wavy track's ring is smaller by the wave's amplitude all round.
    const wavyTrack = trackParts(ref("amplitude"));

    // The wavy indicator's middle line moves in and out of the flat one with its wave (nine
    // around the circle, as `wavyRing` draws them, mirrored right to left with the arcs), so
    // its ends' dots follow it: in by the amplitude less its share of the wave at their angle.
    const onWave = (at: NumericValue) => () =>
        mul(ref("amplitude"), sub(unitless(1), sin(mul(at, unitless(9)))));

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
            "trackTailCap",
            "trackHeadCap",
            "tailCap",
            "headCap",
        ],
        structure: {
            root: ["track", "endHalf", "startHalf", "tailCap", "headCap"],
            track: [
                "trackEndHalf",
                "trackStartHalf",
                "trackTailCap",
                "trackHeadCap",
            ],
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
                    bottom: px(0),
                    insetInlineStart: px(0),
                    insetInlineEnd: px(0),
                    ...flatTrack.track,
                    transition: tweens(circular.own("value")),
                },
                trackEndHalf: half("End"),
                trackEndArc: flatTrack.trackEndArc,
                trackStartHalf: half("Start"),
                trackStartArc: flatTrack.trackStartArc,
                endHalf: half("End"),
                endArc: arc(
                    "End",
                    -135,
                    mul(min(ref("value"), unitless(50)), DEG_PER_PERCENT),
                    min(ref("value"), unitless(50)),
                    ref("activeColor"),
                ),
                startHalf: half("Start"),
                startArc: arc(
                    "Start",
                    45,
                    mul(
                        max(sub(ref("value"), unitless(50)), unitless(0)),
                        DEG_PER_PERCENT,
                    ),
                    max(sub(ref("value"), unitless(50)), unitless(0)),
                    ref("activeColor"),
                ),
                // The rounded ends: the track's at either end of what it draws, the
                // indicator's where it starts and where it has reached.
                trackTailCap: flatTrack.trackTailCap,
                trackHeadCap: flatTrack.trackHeadCap,
                tailCap: cap(degrees(0), ref("activeColor"), ref("value")),
                headCap: cap(valueTurn, ref("activeColor"), ref("value")),
            },
            variants: {
                // The determinate arcs, turning, their length growing from a tenth of the
                // circle to 87% and back (`circularProgressArc`, which animates `value`; a
                // target that can't animate a token keeps half the circle). The track turns
                // with them and follows `value`, so it keeps its gaps to the arc.
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
                    },
                    false: {},
                },
                // M3 Expressive's thick track: every ring takes the thick width.
                thickness: {
                    default: {},
                    thick: {
                        root: {
                            tokens: { thickness: px(8) },
                        },
                    },
                },
                // M3 Expressive's wavy indicator: each arc's ring is as wide as the wave and
                // clipped to it, and the flat track sits on the wave's middle line.
                shape: {
                    flat: {},
                    wavy: {
                        endHalf: wavyHalf("End"),
                        startHalf: wavyHalf("Start"),
                        endArc: wavyArc,
                        startArc: wavyArc,
                        // Inset rather than sized, which React Native lays out too.
                        track: {
                            top: ref("amplitude"),
                            bottom: ref("amplitude"),
                            insetInlineStart: ref("amplitude"),
                            insetInlineEnd: ref("amplitude"),
                            ...wavyTrack.track,
                        },
                        trackEndArc: wavyTrack.trackEndArc,
                        trackStartArc: wavyTrack.trackStartArc,
                        trackTailCap: wavyTrack.trackTailCap,
                        trackHeadCap: wavyTrack.trackHeadCap,
                        // The indicator's ends ride its wave.
                        tailCap: cap(
                            degrees(0),
                            ref("activeColor"),
                            ref("value"),
                            onWave(degrees(0)),
                        ),
                        headCap: cap(
                            valueTurn,
                            ref("activeColor"),
                            ref("value"),
                            onWave(valueTurn),
                        ),
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

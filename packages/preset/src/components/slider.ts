// The pureform slider: Material's slider over Zag's slider machine. By default it's M3
// Expressive's slider (`handleShape: "bar"`): a thick track split by a narrow bar handle, with
// gaps either side of it, at sizes `xsmall` to `xlarge`. `handleShape: "round"` keeps the earlier
// (deprecated, kept) round handle on a thin track with a state layer. `orientation: "vertical"`
// stands it up, its value growing from the bottom.
//
// Everything is placed by tokens, as percentages of the range (0 to 100), which the binding keeps
// in step with the value:
//
// - `value`: where a handle, its state layer, and its value indicator sit. Root carries the last
//   thumb's; a range's first thumb sets its own on its parts.
// - `activeStart`, `activeEnd`: the active track. 0 to the value for a standard slider, the two
//   thumbs for a range, the centre to the value for a centered slider.
// - `startGap`, `endGap`: flags (0 or 1), whether a handle sits at that end of the active track,
//   so the bar handle's gap cuts the tracks there.
// - On a marker (a stop), `value` and `stopActive` (1 on the active track).
//
// The inactive track is two parts: `startTrack` before the active track (a range's or a centered
// slider's) and `track` after it.
//
//   <div class={root} style="--value: 40; --activeEnd: 40">
//     <span class={startTrack} />
//     <span class={track} />
//     <span class={activeTrack} />
//     <div class={markerGroup}><span class={marker} style="--value: 50; --stopActive: 0" /></div>
//     <span class={insetIcon}>♪</span>
//     <div class={handle} role="slider" tabindex="0" aria-valuenow="40">
//       <span class={stateLayer} />
//     </div>
//     <span class={valueIndicator}>40</span>
//     <input class={input} type="hidden" name="volume" value="40" />
//   </div>

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    auto,
    center,
    colorMix,
    max,
    mul,
    none,
    pct,
    px,
    relative,
    slot,
    sub,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ColorValue, NumericValue, StyleMap } from "@pureform/core/ast";
import { radius, size as sizeToken, textStyle } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import { springTweens } from "./shared";
import {
    DEFAULT_GROUP,
    blend,
    colorVariant,
    componentTokens,
    defaultGroups,
    disabledColor,
    entriesOf,
    focusRing,
    iconBox,
    iconFill,
    keysOf,
    indicationRoot,
    mergeSlots,
    on,
    slotStateLayer,
    sys,
    tweens,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const { tokens, ref } = componentTokens("slider", {
    activeColor: sys("primary"),
    trackColor: sys("secondaryContainer"),
    // The stops: on the active track, and on the inactive one.
    stopActiveColor: on("primary"),
    stopColor: on("secondaryContainer"),
    stopSize: px(4),
    valueIndicatorColor: sys("inverseSurface"),
    valueIndicatorContent: sys("inverseOnSurface"),
    valueIndicatorWidth: px(48),
    valueIndicatorHeight: px(44),
    valueIndicatorGap: px(4),
    // An icon inside the active track, at its start (medium and larger sliders), as Compose's
    // SliderWithTrackIconsSample: 20px, 10px in from the track's end. Where the active track is
    // too short for it (the binding marks it `overflowing`), it sits at the start of the inactive
    // track instead, after the handle's gap, in the inactive track's content colour.
    insetIconSize: px(20),
    insetIconPadding: px(10),
    insetIconColor: on("primary"),
    insetIconOutsideColor: on("secondaryContainer"),
    iconFill: unitless(0),
    // Set by `size` (1 from medium up), and shown only on the bar handle's thick track.
    insetIconShown: unitless(0),
    height: sizeToken("touchTarget"),
    trackHeight: px(4),
    handleSize: px(20),
    stateLayerSize: px(40),
    // M3 Expressive's bar handle, with gaps cut into the tracks either side of it.
    barTrackHeight: px(16),
    barHandleWidth: px(4),
    barHandlePressedWidth: px(2),
    barHandleHeight: px(44),
    barRadius: radius("small"),
    // Half the theme's extra-small corner (2px in Material), so a shape theme rounds it too.
    barInnerRadius: mul(radius("extraSmall"), unitless(0.5)),
    // From a bar handle's centre to the far edge of the gap cut either side of it: half its
    // 4px width and Compose's 6px gap. Bindings read it back to place the overflowing icon.
    handleClearance: px(8),
    // Set by `handleShape`: 1 for the bar handle, 0 for the round one.
    bar: unitless(1),
    value: unitless(0),
    activeStart: unitless(0),
    activeEnd: unitless(0),
    startGap: unitless(0),
    endGap: unitless(1),
    stopActive: unitless(0),
    ...INDICATION_TOKENS,
});

const DISABLED = slot("root", "disabled");
const PRESSED = slot("root", "pressed");

const INSETS = [
    "insetInlineStart",
    "insetInlineEnd",
    "insetBlockStart",
    "insetBlockEnd",
] as const;

// Movement settles on the `spatialFast` spring for keyboard steps, but follows the pointer directly while it is down, so a
// drag doesn't trail behind it. Colors ease either way.
const follows = (...also: ("width" | "height")[]) =>
    when()
        .on(PRESSED, springTweens("spatialFast", also, ["backgroundColor"]))
        .else(
            springTweens(
                "spatialFast",
                [...INSETS, ...also],
                ["backgroundColor"],
            ),
        );

const percent = (token: Parameters<typeof ref>[0]) => mul(ref(token), pct(1));
const half = (length: NumericValue) => mul(length, unitless(0.5));

// Bar handle or round, by the `bar` flag.
const byShape = (round: NumericValue, bar: NumericValue) =>
    blend(round, bar, ref("bar"));
const THICKNESS = byShape(ref("trackHeight"), ref("barTrackHeight"));
// From a handle's centre to the edge of the gap around it; none for the round handle.
const CLEARANCE = mul(ref("bar"), ref("handleClearance"));
const OUTER = byShape(radius("full"), ref("barRadius"));
const INNER = byShape(radius("full"), ref("barInnerRadius"));
// A track end's corner: the inner one where a handle's gap cuts it.
const cornerAt = (gap: "startGap" | "endGap") => blend(OUTER, INNER, ref(gap));

const HANDLE_ACROSS = byShape(ref("handleSize"), ref("barHandleHeight"));
/** A track piece from `from` (a length from the start of the range) to `to` (a length from its
 *  end), `ends` its corners at the start and the end, in one orientation. */
interface Segment {
    from: NumericValue;
    to: NumericValue;
    ends: [NumericValue, NumericValue];
}

// The track pieces, by the tokens.
const SEGMENTS = {
    startTrack: {
        from: px(0),
        to: add(
            sub(pct(100), percent("activeStart")),
            mul(CLEARANCE, ref("startGap")),
        ),
        ends: [OUTER, cornerAt("startGap")],
    },
    activeTrack: {
        from: add(percent("activeStart"), mul(CLEARANCE, ref("startGap"))),
        to: add(
            sub(pct(100), percent("activeEnd")),
            mul(CLEARANCE, ref("endGap")),
        ),
        ends: [cornerAt("startGap"), cornerAt("endGap")],
    },
    track: {
        from: add(percent("activeEnd"), mul(CLEARANCE, ref("endGap"))),
        to: px(0),
        ends: [cornerAt("endGap"), OUTER],
    },
} satisfies Record<string, Segment>;

const across = sub(pct(50), half(THICKNESS));

const horizontalSegment = ({
    from,
    to,
    ends: [start, end],
}: Segment): StyleMap => ({
    insetInlineStart: from,
    insetInlineEnd: to,
    insetBlockStart: across,
    insetBlockEnd: across,
    borderStartStartRadius: start,
    borderEndStartRadius: start,
    borderStartEndRadius: end,
    borderEndEndRadius: end,
});

// Standing up, the range runs from the bottom (block end) to the top.
const verticalSegment = ({
    from,
    to,
    ends: [start, end],
}: Segment): StyleMap => ({
    insetBlockEnd: from,
    insetBlockStart: to,
    insetInlineStart: across,
    insetInlineEnd: across,
    borderEndStartRadius: start,
    borderEndEndRadius: start,
    borderStartStartRadius: end,
    borderStartEndRadius: end,
});

/** A box `along` long on the range's axis and `acrossSize` across it, centred on the value and on
 *  the track. */
const horizontalAt = (
    along: NumericValue,
    acrossSize: NumericValue,
): StyleMap => ({
    insetInlineStart: sub(percent("value"), half(along)),
    insetBlockStart: sub(pct(50), half(acrossSize)),
    width: along,
    height: acrossSize,
});

const verticalAt = (
    along: NumericValue,
    acrossSize: NumericValue,
): StyleMap => ({
    insetBlockStart: sub(sub(pct(100), percent("value")), half(along)),
    insetInlineStart: sub(pct(50), half(acrossSize)),
    width: acrossSize,
    height: along,
});

// The handle's length along the axis, as it narrows on a press, for the boxes centred on it.
const handleBox = (at: typeof horizontalAt): StyleMap => {
    const narrow = byShape(ref("handleSize"), ref("barHandlePressedWidth"));
    const wide = byShape(ref("handleSize"), ref("barHandleWidth"));
    const box = at(wide, HANDLE_ACROSS);
    const pressed = at(narrow, HANDLE_ACROSS);
    const out: StyleMap = {};
    for (const [key, value] of Object.entries(box)) {
        const other = pressed[key as keyof StyleMap];
        (out as Record<string, unknown>)[key] =
            other === value
                ? value
                : when()
                      .on(PRESSED, other as never)
                      .else(value as never);
    }
    return out;
};

// The value indicator floats beside the handle, `valueIndicatorGap` from it: above it, or before
// it when vertical. Where its far edge sits.
const BESIDE = sub(sub(pct(50), half(HANDLE_ACROSS)), ref("valueIndicatorGap"));

// Where an overflowing inset icon starts: past the active track's end and the handle's gap, in by
// the padding.
const INACTIVE_START = add(
    add(percent("activeEnd"), mul(CLEARANCE, ref("endGap"))),
    ref("insetIconPadding"),
);

const geometry = (vertical: boolean) => {
    const segment = vertical ? verticalSegment : horizontalSegment;
    const at = vertical ? verticalAt : horizontalAt;
    return {
        startTrack: segment(SEGMENTS.startTrack),
        activeTrack: segment(SEGMENTS.activeTrack),
        track: segment(SEGMENTS.track),
        markerGroup: {
            insetInlineStart: px(0),
            insetInlineEnd: px(0),
            insetBlockStart: px(0),
            insetBlockEnd: px(0),
        },
        marker: at(ref("stopSize"), ref("stopSize")),
        insetIcon: vertical
            ? {
                  insetBlockEnd: add(
                      percent("activeStart"),
                      ref("insetIconPadding"),
                  ),
                  insetInlineStart: sub(pct(50), half(ref("insetIconSize"))),
                  states: {
                      overflowing: {
                          insetBlockEnd: INACTIVE_START,
                          insetInlineStart: sub(
                              pct(50),
                              half(ref("insetIconSize")),
                          ),
                      },
                  },
              }
            : {
                  insetInlineStart: add(
                      percent("activeStart"),
                      ref("insetIconPadding"),
                  ),
                  insetBlockStart: sub(pct(50), half(ref("insetIconSize"))),
                  states: {
                      overflowing: {
                          insetInlineStart: INACTIVE_START,
                          insetBlockStart: sub(
                              pct(50),
                              half(ref("insetIconSize")),
                          ),
                      },
                  },
              },
        handle: handleBox(at),
        valueIndicator: vertical
            ? {
                  insetBlockStart: sub(
                      sub(pct(100), percent("value")),
                      half(ref("valueIndicatorHeight")),
                  ),
                  insetInlineStart: sub(BESIDE, ref("valueIndicatorWidth")),
              }
            : {
                  insetInlineStart: sub(
                      percent("value"),
                      half(ref("valueIndicatorWidth")),
                  ),
                  insetBlockStart: sub(BESIDE, ref("valueIndicatorHeight")),
              },
    } satisfies Record<string, StyleMap>;
};

/** One of M3 Expressive's slider sizes: the track's thickness, the bar handle's height, and the
 *  track's outer corner radius. */
export const SLIDER_SIZES = {
    xsmall: {
        track: px(16),
        handle: px(44),
        radius: radius("small"),
        insetIcon: false,
    },
    small: {
        track: px(24),
        handle: px(44),
        radius: radius("small"),
        insetIcon: false,
    },
    medium: {
        track: px(40),
        handle: px(52),
        radius: radius("medium"),
        insetIcon: true,
    },
    large: {
        track: px(56),
        handle: px(68),
        radius: radius("large"),
        insetIcon: true,
    },
    xlarge: {
        track: px(96),
        handle: px(108),
        radius: radius("extraLarge"),
        insetIcon: true,
    },
} as const;

const unlessDisabled = (
    color: ColorValue,
    level: "disabledContent" | "disabledContainer",
) => ({
    backgroundColor: when().on(DISABLED, disabledColor(level)).else(color),
});

// Every property that depends on the color group.
const colored = (
    active: ColorValue,
    onActive: ColorValue,
    icon: ColorValue = onActive,
) => ({
    activeTrack: unlessDisabled(active, "disabledContent"),
    handle: unlessDisabled(active, "disabledContent"),
    insetIcon: {
        color: when()
            .on(DISABLED, disabledColor("disabledContainer"))
            .else(icon),
        // Off the active track, it takes the inactive track's content colour.
        states: {
            overflowing: {
                color: when()
                    .on(DISABLED, disabledColor("disabledContainer"))
                    .else(ref("insetIconOutsideColor")),
            },
        },
    },
    marker: unlessDisabled(
        colorMix(ref("stopColor"), onActive, mul(ref("stopActive"), pct(100))),
        "disabledContent",
    ),
    stateLayer: {
        backgroundColor: slotStateLayer(ref, "handle", {
            base: transparent,
            content: active,
        }),
    },
});

// The root's size across the track: the touch target, or the bar handle when taller.
const ROOT_ACROSS = max(ref("height"), mul(ref("bar"), ref("barHandleHeight")));

const pf = typed();

/** Build the slider with a `color` variant per group in `groups`. */
export const createSlider = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "slider",
            $meta: {
                description:
                    "Material slider on Zag's slider machine: standard, centered, or a range, with stops and a value indicator. Keep its tokens (value, activeStart, activeEnd, startGap, endGap; percentages of the range) in step with the value. handleShape bar (M3 Expressive, at sizes xsmall to xlarge) or round (the earlier slider); orientation horizontal or vertical. insetIcon is an icon inside the active track, shown at sizes medium and up.",
            },
            tokens,
            slots: [
                "root",
                "startTrack",
                "track",
                "activeTrack",
                "markerGroup",
                "marker",
                "stateLayer",
                "insetIcon",
                "handle",
                "valueIndicator",
                "input",
            ],
            structure: {
                root: [
                    "startTrack",
                    "track",
                    "activeTrack",
                    "markerGroup",
                    "insetIcon",
                    "handle",
                    "valueIndicator",
                    "input",
                ],
                markerGroup: ["marker"],
                handle: ["stateLayer"],
            },
            // A drag holds the press: the state layer shows it pressed.
            indication: [
                {
                    trigger: "handle",
                    surface: "stateLayer",
                    centered: true,
                    focus: "handle",
                },
            ],
            variants: {
                color: groups as ColorGroups,
                handleShape: ["bar", "round"],
                size: keysOf(SLIDER_SIZES),
                orientation: ["horizontal", "vertical"],
            },
            recipe: () => {
                const horizontal = geometry(false);
                const baseColors = colored(
                    ref("activeColor"),
                    ref("stopActiveColor"),
                    ref("insetIconColor"),
                );
                const icon = iconBox(ref("insetIconSize"), {
                    fill: iconFill(ref("iconFill")),
                });
                const piece = (moves: StyleMap): StyleMap => ({
                    position: absolute,
                    pointerEvents: none,
                    ...moves,
                });
                return {
                    base: mergeSlots(
                        {
                            root: {
                                ...indicationRoot(ref),
                                position: relative,
                                width: pct(100),
                                height: ROOT_ACROSS,
                            },
                            startTrack: {
                                ...piece(horizontal.startTrack),
                                ...unlessDisabled(
                                    ref("trackColor"),
                                    "disabledContainer",
                                ),
                                transition: follows(),
                            },
                            track: {
                                ...piece(horizontal.track),
                                ...unlessDisabled(
                                    ref("trackColor"),
                                    "disabledContainer",
                                ),
                                transition: follows(),
                            },
                            activeTrack: {
                                ...piece(horizontal.activeTrack),
                                transition: follows(),
                            },
                            markerGroup: piece(horizontal.markerGroup),
                            marker: {
                                ...piece(horizontal.marker),
                                borderRadius: radius("full"),
                            },
                            // An icon inside the active track, at its start, over the track
                            // and under the handle; only medium and larger sliders show it.
                            insetIcon: {
                                ...icon,
                                ...piece(horizontal.insetIcon),
                                opacity: mul(ref("insetIconShown"), ref("bar")),
                            },
                            // Inside the handle, centred on it: it shows the handle's
                            // hover, focus, and press.
                            stateLayer: {
                                position: absolute,
                                pointerEvents: none,
                                insetInlineStart: sub(
                                    pct(50),
                                    half(ref("stateLayerSize")),
                                ),
                                insetBlockStart: sub(
                                    pct(50),
                                    half(ref("stateLayerSize")),
                                ),
                                width: ref("stateLayerSize"),
                                height: ref("stateLayerSize"),
                                borderRadius: radius("full"),
                                transition: tweens("backgroundColor"),
                            },
                            handle: {
                                ...piece(horizontal.handle),
                                pointerEvents: auto,
                                borderRadius: INNER,
                                // It narrows smoothly on a press, and follows the pointer
                                // directly while it's down, as the tracks do.
                                transition: follows("width", "height"),
                                ...focusRing(
                                    ref,
                                    slot("handle", "focusVisibleWithin"),
                                ),
                            },
                            valueIndicator: {
                                ...piece(horizontal.valueIndicator),
                                width: ref("valueIndicatorWidth"),
                                height: ref("valueIndicatorHeight"),
                                borderRadius: radius("full"),
                                backgroundColor: ref("valueIndicatorColor"),
                                color: ref("valueIndicatorContent"),
                                textStyle: textStyle("labelLarge"),
                                lineHeight: ref("valueIndicatorHeight"),
                                textAlign: center,
                            },
                            input: { display: none },
                        },
                        {
                            ...baseColors,
                            // Its states join the icon's and the placement's.
                            insetIcon: {
                                ...baseColors.insetIcon,
                                states: {
                                    ...icon.states,
                                    ...horizontal.insetIcon.states,
                                    overflowing: {
                                        ...horizontal.insetIcon.states
                                            .overflowing,
                                        ...baseColors.insetIcon.states
                                            .overflowing,
                                    },
                                },
                            },
                        },
                    ),
                    variants: {
                        color: colorVariant(groups, (g) =>
                            colored(g.main, g.on),
                        ),
                        // `bar` is M3 Expressive's slider: a thick track, split by a narrow bar
                        // handle that narrows further while pressed, and no state layer.
                        // `round` is the earlier slider, with a round handle on a thin track.
                        handleShape: {
                            bar: {
                                root: { tokens: { bar: unitless(1) } },
                                stateLayer: { display: none },
                            },
                            round: { root: { tokens: { bar: unitless(0) } } },
                        },
                        // The bar handle's sizes; the round handle has one.
                        size: Object.fromEntries(
                            entriesOf(SLIDER_SIZES).map(([name, s]) => [
                                name,
                                {
                                    root: {
                                        tokens: {
                                            barTrackHeight: s.track,
                                            barHandleHeight: s.handle,
                                            barRadius: s.radius,
                                            insetIconShown: unitless(
                                                s.insetIcon ? 1 : 0,
                                            ),
                                        },
                                    },
                                },
                            ]),
                        ),
                        orientation: {
                            horizontal: {},
                            vertical: {
                                ...geometry(true),
                                root: { width: ROOT_ACROSS, height: pct(100) },
                            },
                        },
                    },
                    defaultVariants: {
                        color: DEFAULT_GROUP,
                        handleShape: "bar",
                        size: "xsmall",
                        orientation: "horizontal",
                    },
                };
            },
        }),
    );

export const slider = createSlider();

// The pureform switch: Material's switch.
//
// Markup: a native checkbox laid over the track, with `role="switch"` for screen readers, and
// the handle inside the track. The state layer is a circle that follows the handle. Render an
// icon in the handle if you want one; by default it shows when the switch is on, and `icons`
// shows it in both states (with Material's off icon color) or never.
//
//   <span class={root}>
//     <span class={touchTarget} />
//     <input class={input} type="checkbox" role="switch" />
//     <span class={track}>
//       <span class={stateLayer} />
//       <span class={handle}><span class={icon}>✓</span></span>
//     </span>
//   </span>

import { typed } from "@pureform/core";
import {
    absolute,
    center,
    inlineFlex,
    none,
    pct,
    pointer,
    px,
    relative,
    solid,
    transform,
    translate,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ColorValue } from "@pureform/core/ast";
import { radius, size as sizeToken } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import {
    CONTROL_CHECKED,
    CONTROL_DISABLED,
    CONTROL_PRESSED,
    CONTROL_HOVER,
    controlInput,
    controlStateLayer,
    controlTouchTarget,
    CONTROL_FOCUS,
} from "./control";
import {
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    defaultGroups,
    disabledColor,
    focusRing,
    INDICATION_ROOT,
    mergeSlots,
    stateTransition,
    sys,
    variantsOf,
} from "./shared";
import { spatialTweens } from "./shaped";
import type { ColorGroup, ColorGroups } from "./shared";

const pf = typed();

// Named switchControl, not switch: Panda names the generated recipe after the component, and
// `switch` is a reserved word.
const { tokens, ref } = componentTokens("switchControl", {
    trackWidth: px(52),
    trackHeight: px(32),
    outlineWidth: px(2),
    handleSize: px(16),
    handleSizeChecked: px(24),
    handleSizePressed: px(28),
    stateLayerSize: sizeToken("controlMedium"),
    iconSize: px(16),
    // Handle centers along the track: off at the start, on at the end.
    handleOff: px(16),
    handleOn: px(36),
    trackColor: sys("surfaceContainerHighest"),
    outlineColor: sys("outline"),
    handleColor: sys("outline"),
    handleHoverColor: sys("onSurfaceVariant"),
    checkedTrackColor: sys("primary"),
    checkedHandleColor: sys("onPrimary"),
    checkedHandleHoverColor: sys("primaryContainer"),
    iconColor: sys("onPrimaryContainer"),
    uncheckedIconColor: sys("surfaceContainerHighest"),
    ...INDICATION_TOKENS,
});

// Where the handle and its state layer sit along the track.
const along = when()
    .on(CONTROL_CHECKED, ref("handleOn"))
    .else(ref("handleOff"));

// Centered on its inline start: the translation runs against the inline direction, so it
// flips under rtl, where the start is on the right.
const centered = when(
    "rtl",
    transform(translate(pct(50), pct(-50))),
    transform(translate(pct(-50), pct(-50))),
);

/** The colors a switch takes from its color group. */
interface SwitchColors {
    track: ColorValue;
    handle: ColorValue;
    handleHover: ColorValue;
    icon: ColorValue;
}

// Every property that depends on the color group, each with its full set of states.
const colored = (c: SwitchColors) => ({
    track: {
        outlineColor: when()
            .on(CONTROL_CHECKED, c.track)
            .on(CONTROL_DISABLED, disabledColor("disabledContainer"))
            .else(ref("outlineColor")),
        backgroundColor: when()
            .on(CONTROL_CHECKED, c.track)
            .on(CONTROL_DISABLED, disabledColor("disabledContainer"))
            .else(ref("trackColor")),
    },
    stateLayer: {
        backgroundColor: controlStateLayer(ref, sys("onSurface"), c.track),
    },
    handle: {
        backgroundColor: when()
            .on(CONTROL_HOVER, ref("handleHoverColor"))
            .on(CONTROL_CHECKED, c.handle)
            .on([CONTROL_CHECKED, CONTROL_HOVER], c.handleHover)
            .on(CONTROL_DISABLED, disabledColor("disabledContent"))
            .on([CONTROL_CHECKED, CONTROL_DISABLED], sys("surface"))
            .else(ref("handleColor")),
    },
    // The off icon shows only with `icons: "both"`.
    icon: {
        color: when()
            .on(CONTROL_CHECKED, c.icon)
            .else(ref("uncheckedIconColor")),
    },
});

/** Build the switch with a `color` variant per group in `groups`. */
export const createSwitch = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "switchControl",
            $meta: {
                description:
                    'Material switch over a native checkbox with role="switch". icons sets when an icon in the handle shows: when on (selected), in both states (both), or never (none).',
            },
            tokens,
            slots: [
                "root",
                "touchTarget",
                "input",
                "track",
                "stateLayer",
                "handle",
                "icon",
            ],
            structure: {
                root: ["touchTarget", "input", "track"],
                track: ["stateLayer", "handle"],
                handle: ["icon"],
            },
            indication: [
                {
                    trigger: "input",
                    surface: "stateLayer",
                    centered: true,
                    focus: "root",
                },
            ],
            variants: {
                color: groups as ColorGroups,
                icons: ["selected", "both", "none"],
            },
            recipe: () => ({
                base: mergeSlots(
                    {
                        root: {
                            ...INDICATION_ROOT,
                            ...focusRing(ref, CONTROL_FOCUS),
                            borderRadius: radius("full"),
                            position: relative,
                            display: inlineFlex,
                            cursor: pointer,
                            width: ref("trackWidth"),
                            height: ref("trackHeight"),
                        },
                        touchTarget: controlTouchTarget,
                        // Above the track, so it takes every click.
                        input: { ...controlInput, zIndex: unitless(1) },
                        track: {
                            transition: stateTransition,
                            position: relative,
                            width: pct(100),
                            height: pct(100),
                            borderRadius: radius("full"),
                            outlineStyle: solid,
                            outlineOffset: px(0),
                            outlineWidth: ref("outlineWidth"),
                        },
                        stateLayer: {
                            position: absolute,
                            top: pct(50),
                            insetInlineStart: along,
                            transform: centered,
                            width: ref("stateLayerSize"),
                            height: ref("stateLayerSize"),
                            borderRadius: radius("full"),
                            pointerEvents: none,
                            transition: spatialTweens(
                                "spatialFast",
                                "insetInlineStart",
                                "backgroundColor",
                            ),
                        },
                        handle: {
                            position: absolute,
                            top: pct(50),
                            insetInlineStart: along,
                            transform: centered,
                            display: inlineFlex,
                            alignItems: center,
                            justifyContent: center,
                            borderRadius: radius("full"),
                            pointerEvents: none,
                            width: when()
                                .on(CONTROL_CHECKED, ref("handleSizeChecked"))
                                .on(CONTROL_PRESSED, ref("handleSizePressed"))
                                .else(ref("handleSize")),
                            height: when()
                                .on(CONTROL_CHECKED, ref("handleSizeChecked"))
                                .on(CONTROL_PRESSED, ref("handleSizePressed"))
                                .else(ref("handleSize")),
                            transition: spatialTweens(
                                "spatialFast",
                                "insetInlineStart",
                                "width",
                                "height",
                                "backgroundColor",
                            ),
                        },
                        icon: {
                            display: inlineFlex,
                            fontSize: ref("iconSize"),
                            lineHeight: unitless(1),
                            opacity: when()
                                .on(CONTROL_CHECKED, unitless(1))
                                .else(unitless(0)),
                        },
                    },
                    colored({
                        track: ref("checkedTrackColor"),
                        handle: ref("checkedHandleColor"),
                        handleHover: ref("checkedHandleHoverColor"),
                        icon: ref("iconColor"),
                    }),
                ),
                variants: {
                    color: colorVariant(groups, (g) =>
                        colored({
                            track: g.main,
                            handle: g.on,
                            handleHover: g.container,
                            icon: g.onContainer,
                        }),
                    ),
                    // Material's switch shows an icon when on (`selected`), in both states
                    // (`both`, where the off handle takes the on handle's size), or not at all.
                    icons: {
                        selected: {},
                        both: {
                            handle: {
                                width: when()
                                    .on(
                                        CONTROL_PRESSED,
                                        ref("handleSizePressed"),
                                    )
                                    .else(ref("handleSizeChecked")),
                                height: when()
                                    .on(
                                        CONTROL_PRESSED,
                                        ref("handleSizePressed"),
                                    )
                                    .else(ref("handleSizeChecked")),
                            },
                            icon: { opacity: unitless(1) },
                        },
                        none: { icon: { display: none } },
                    },
                },
                defaultVariants: { color: DEFAULT_GROUP, icons: "selected" },
            }),
        }),
    );

export const switchControl = createSwitch();

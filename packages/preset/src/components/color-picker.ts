// The pureform color picker: an inline picker over Zag's color picker, pureform's own design with
// Material's roles and shapes (M3 doesn't specify a color picker). A saturation and brightness
// area, a hue slider, an optional alpha slider over a transparency grid, a row with the value's
// swatch, a text field for its hex value and the eye dropper, and preset swatches.
//
// The area works in Zag's HSB space (saturation across, brightness up), not M3's HCT tone and
// chroma: Zag's area and its gradients are HSB/HSL only, and an HCT area would need its own
// machine and gamut mapping. The text field and the eye dropper's icon button are the text field
// and icon button components, so they have no slot here.
//
//   <div class={root} style="--value: #6750a4">
//     <label class={label}>Seed color</label>
//     <div class={content}>
//       <div class={area} role="group">
//         <div class={areaBackground} style="background: …" />
//         <div class={areaThumb} role="slider" tabindex="0" style="left: 40%; top: 30%" />
//       </div>
//       <div class={channelSlider} data-channel="hue">
//         <div class={channelSliderTrack} style="background-image: …" />
//         <div class={channelSliderThumb} role="slider" tabindex="0" />
//       </div>
//       <div class={channelSlider} data-channel="alpha">
//         <div class={transparencyGrid} />
//         <div class={channelSliderTrack} />
//         <div class={channelSliderThumb} role="slider" tabindex="0" />
//       </div>
//       <div class={control}>
//         <div class={valueSwatch} style="background: #6750a4" />
//         (text field) (eye dropper icon button)
//       </div>
//       <div class={swatchGroup}>
//         <button class={swatchTrigger} aria-pressed="true"><div class={swatch} /></button>
//       </div>
//     </div>
//   </div>

import { typed } from "@pureform/core";
import {
    absolute,
    center,
    column,
    flex,
    hidden,
    pct,
    pointer,
    px,
    relative,
    row,
    solid,
    transparent,
    unitless,
    wrap,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { opacity, radius, spacing, textStyle } from "@pureform/theme";

import { themeIndication } from "../state-layer";
import { componentTokens, dense, focusRing, sys } from "./shared";

const { tokens, ref } = componentTokens("colorPicker", {
    // The space between the picker's sections.
    gap: spacing("4"),
    width: px(320),
    labelColor: sys("onSurfaceVariant"),
    areaHeight: px(176),
    areaRadius: radius("medium"),
    // A channel slider's track (the M3 Expressive slider's extra-small track) and its radius.
    trackHeight: px(16),
    trackRadius: radius("full"),
    // The area's and the sliders' thumbs: a disc of the color under them, ringed in `surface`.
    thumbSize: px(24),
    thumbBorderWidth: px(3),
    thumbBorderColor: sys("surface"),
    thumbRadius: radius("full"),
    // The preview of the value, beside the text field.
    valueSwatchSize: px(56),
    valueSwatchRadius: radius("medium"),
    // A preset swatch, and the ring around the selected one.
    swatchSize: px(32),
    swatchRadius: radius("full"),
    swatchGap: spacing("2"),
    swatchRingWidth: px(2),
    swatchRingGap: px(2),
    swatchRingColor: sys("onSurface"),
    // Lines drawn round swatches so a color close to the surface still shows its edge.
    swatchOutline: sys("outlineVariant"),
    disabledOpacity: opacity("disabledContent"),
});

const pf = typed();

/** A thumb: a disc ringed in `surface`, lifted off the gradient below it. Zag places it and
 *  fills it with the color under it. */
const thumb: StyleMap = {
    ...focusRing(themeIndication),
    position: absolute,
    width: ref("thumbSize"),
    height: ref("thumbSize"),
    borderRadius: ref("thumbRadius"),
    borderStyle: solid,
    borderWidth: ref("thumbBorderWidth"),
    borderColor: ref("thumbBorderColor"),
    apply: { shadowElevation: "level1" },
    states: { disabled: { opacity: ref("disabledOpacity") } },
};

export const colorPicker = pf.slotComponent({
    name: "colorPicker",
    $meta: {
        description:
            "Inline color picker over Zag's color picker: a saturation and brightness area, a hue slider and an optional alpha slider, the value's swatch, a hex text field and the eye dropper, and preset swatches. Pureform's own design (M3 has none).",
    },
    tokens,
    slots: [
        "root",
        "label",
        "content",
        "area",
        "areaBackground",
        "areaThumb",
        "channelSlider",
        "transparencyGrid",
        "channelSliderTrack",
        "channelSliderThumb",
        "control",
        "valueSwatch",
        "swatchGroup",
        "swatchTrigger",
        "swatch",
    ],
    structure: {
        root: ["label", "content"],
        content: ["area", "channelSlider", "control", "swatchGroup"],
        area: ["areaBackground", "areaThumb"],
        channelSlider: [
            "transparencyGrid",
            "channelSliderTrack",
            "channelSliderThumb",
        ],
        control: ["valueSwatch"],
        swatchGroup: ["swatchTrigger"],
        swatchTrigger: ["swatch"],
    },
    recipe: () => ({
        base: {
            root: {
                display: flex,
                flexDirection: column,
                gap: spacing("2"),
                width: ref("width"),
                maxWidth: pct(100),
            },
            label: {
                textStyle: textStyle("labelLarge"),
                color: ref("labelColor"),
            },
            content: {
                display: flex,
                flexDirection: column,
                gap: ref("gap"),
            },
            area: {
                position: relative,
                height: ref("areaHeight"),
                borderRadius: ref("areaRadius"),
            },
            areaBackground: {
                width: pct(100),
                height: pct(100),
                borderRadius: ref("areaRadius"),
            },
            areaThumb: thumb,
            channelSlider: {
                position: relative,
                display: flex,
                alignItems: center,
                height: ref("thumbSize"),
            },
            transparencyGrid: {
                position: absolute,
                insetInlineStart: px(0),
                insetInlineEnd: px(0),
                height: ref("trackHeight"),
                borderRadius: ref("trackRadius"),
                overflow: hidden,
            },
            channelSliderTrack: {
                position: relative,
                flexGrow: unitless(1),
                height: ref("trackHeight"),
                borderRadius: ref("trackRadius"),
            },
            // Zag places it at the value (`left`, `top: 50%`); the binding centres it there.
            channelSliderThumb: thumb,
            control: {
                display: flex,
                flexDirection: row,
                alignItems: center,
                gap: spacing("3"),
            },
            valueSwatch: {
                flexShrink: unitless(0),
                width: dense(ref("valueSwatchSize")),
                height: dense(ref("valueSwatchSize")),
                borderRadius: ref("valueSwatchRadius"),
                borderStyle: solid,
                borderWidth: px(1),
                borderColor: ref("swatchOutline"),
            },
            swatchGroup: {
                display: flex,
                flexDirection: row,
                flexWrap: wrap,
                gap: ref("swatchGap"),
            },
            swatchTrigger: {
                ...focusRing(themeIndication),
                display: flex,
                alignItems: center,
                justifyContent: center,
                padding: ref("swatchRingGap"),
                borderStyle: solid,
                borderWidth: ref("swatchRingWidth"),
                borderColor: transparent,
                borderRadius: ref("swatchRadius"),
                backgroundColor: transparent,
                cursor: pointer,
                states: {
                    selected: { borderColor: ref("swatchRingColor") },
                    disabled: { opacity: ref("disabledOpacity") },
                },
            },
            swatch: {
                width: ref("swatchSize"),
                height: ref("swatchSize"),
                borderRadius: ref("swatchRadius"),
                borderStyle: solid,
                borderWidth: px(1),
                borderColor: ref("swatchOutline"),
            },
        },
    }),
});

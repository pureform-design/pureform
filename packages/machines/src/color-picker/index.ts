// Zag's color picker, re-exported so bindings take every machine from one package: a 2D area
// over two channels (saturation and brightness by default), channel sliders (hue, alpha), channel
// inputs, swatches and the eye dropper, inline or in a popover. `parse` reads any CSS color into
// Zag's `Color`, which React Native uses for its own picker. The anatomy adds `valueSwatch`.

export * from "@zag-js/color-picker";
export { anatomy, parts } from "./color-picker.anatomy";

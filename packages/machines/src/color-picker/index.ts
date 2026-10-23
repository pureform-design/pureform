// Zag's color picker, re-exported so bindings take every machine from one package: a 2D area
// over two channels (saturation and brightness by default), channel sliders (hue, alpha), channel
// inputs, swatches and the eye dropper, inline or in a popover. `parse` reads any CSS color into
// Zag's `Color`, which React Native uses for its own picker. The anatomy adds `valueSwatch`. Its
// machine has pureform's form rules: the browser's fieldset rule around the hidden input, and no
// reset of its own (the bindings own it).

import { machine as zagMachine, type Machine } from "@zag-js/color-picker";

import { withFieldsetRule, zagElement } from "../zag-form";

export * from "@zag-js/color-picker";
export { anatomy, parts } from "./color-picker.anatomy";

/** Zag's color picker machine, with pureform's fieldset rule and no reset of its own. */
export const machine: Machine = withFieldsetRule(
    zagMachine,
    zagElement("hiddenInput", (id) => `color-picker:${id}:hidden-input`),
    "trackFormControl",
);

// Zag's number input, re-exported so bindings take every machine from one package, with the parts
// the preset's number field draws. The input is a `spinbutton`: the arrow keys step it (Shift
// for `largeStep`), Home and End go to the limits, a value is clamped on blur, typed text is
// parsed in the locale (`formatOptions`), and pressing and holding a trigger repeats (after
// 300ms, every 50ms).

export * from "@zag-js/number-input";
export { anatomy, parts } from "./number-input.anatomy";

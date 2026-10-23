// Zag's pin input, re-exported so bindings take every machine from one package, with the parts
// the preset's code field draws. Typing moves focus to the next cell, Backspace clears a cell and
// moves back, the arrow keys, Home and End move between cells, and pasting a whole code fills
// every cell. `otp` sets `autocomplete="one-time-code"`, and `mask` hides each character.

export * from "@zag-js/pin-input";
export { anatomy, parts } from "./pin-input.anatomy";

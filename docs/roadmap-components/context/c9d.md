# c9d: ColorPicker (output context)

Branch `c9d-color-picker`, from main `e1011942`. Commits: `git log e1011942..c9d-color-picker`. Not
pushed; main untouched.

Sources, read 2026-10-23: Zag's `@zag-js/color-picker` 1.46.0 (new dependency, catalog `^1.46.0`;
`bun.lock` gains it and `@zag-js/color-utils`), its anatomy, `connect` and machine (inline mode,
`EyeDropper`, area and channel slider props). M3 has no color picker (Compose, MDC-Android and
Material Web have none), so **the design is pureform's own**, from Material's roles, shapes and the
M3 Expressive slider's extra-small track (16). Recorded as such in the gap analysis.

## Decisions

- **HSB area, not HCT.** Zag's area and its gradients work in HSB/HSL only. An HCT tone × chroma
  area (from `@pureform/material`'s `Hct`) would need our own machine, gamut mapping (most
  tone/chroma pairs at a hue are out of sRGB) and its own gradient drawing (no CSS gradient
  follows HCT). Saturation runs across, brightness up. Recorded in the preset's header and READMEs.
- **Inline only.** The picker is the panel itself (Zag's `inline: true`). A trigger and a popover
  are c9c's Popover's; an app wraps the inline picker in one.
- **Uses the text field and icon button components:** the hex field is an outlined `TextField`
  (`prefixText="#"`, label "Hex", controlled from a draft: Enter or leaving it sets the color; text
  that isn't hex marks it invalid until left, which puts the value back). Zag's channel inputs
  aren't used (they write the DOM's value directly, which the text field's machine doesn't see).
  The eye dropper is an `IconButton` with a new `colorize` glyph (binding-core `GLYPH_PATHS`, React
  and Solid `ColorizeIcon`), rendered once mounted where `window.EyeDropper` exists. The sliders
  are Zag's channel sliders styled like the M3 slider's extra-small track, not the `Slider`
  component (its tracks can't take a gradient).
- **Value as strings.** `value`/`defaultValue` take any CSS color; `onValueChange` and
  `onValueChangeEnd` report hex (`#rrggbb`, `#rrggbbaa` when not opaque), which the runtime theme
  takes as a seed. Default `#6750a4` (Material's baseline seed). A controlled value that comes back
  as the hex just reported reuses the machine's last `Color`, so a grey keeps its hue. The hidden
  input submits the hex (not Zag's `hsba(…)`).
- **Swatches** are `aria-pressed` toggle buttons (the `selected` state), ringed in `onSurface`
  (UI contrast against `surface` in `contrast.ts`).

## Built

- **Preset** `color-picker.ts` (count 68): slots `root`, `label`, `content`, `area`,
  `areaBackground`, `areaThumb`, `channelSlider`, `transparencyGrid`, `channelSliderTrack`,
  `channelSliderThumb`, `control`, `valueSwatch`, `swatchGroup`, `swatchTrigger`, `swatch`. No
  variants, 0 compounds. Radii from roles (`medium` area and value swatch, `full` tracks, thumbs,
  swatches); thumbs are 24 discs ringed in `surface` at elevation level 1 with the focus ring;
  `valueSwatch` sizes take density. Spec with snapshot; registered in `index.ts`, `pureform.ts`,
  `pureform.spec.ts`, `contrast.ts`.
- **machines** `color-picker/`: Zag's re-exported, anatomy `extendWith("valueSwatch")`, exported
  only from `@pureform/machines/color-picker` (see open questions); drift pair, `index.spec`.
- **anatomy**: regenerated (`colorPickerAnatomy`, `pf-color-picker-*`).
- **binding-core** `components/color-picker.ts`: `ColorPickerRootOwnProps`,
  `ColorPickerContentProps` (`label`, `area`, `alpha`, `swatches`, `inputLabel`, `eyeDropper`,
  `eyeDropperLabel`), `COLOR_PICKER_ROOT_PROPS`, `COLOR_PICKER_DEFAULT`, `colorPickerSelection`,
  `colorPickerHex`, `colorPickerHexText`, `colorPickerSwatchLabel`, `colorPickerFraction`,
  `COLOR_PICKER_THUMB_CENTRE`, `hasEyeDropper`; `usage.ts` entry (`colorPicker`, `textField`,
  `iconButton`, `ripple`). `value` is `@control color`; `defaultValue` and `name` `@control none`.
- **React and Solid** `color-picker/`: `ColorPicker.Root` (the machine, hidden input), `Label`,
  `Content`, `Area`, `ChannelSlider` (`channel`), `Control`, `ValueSwatch`, `HexField`,
  `EyeDropperTrigger`, `SwatchGroup`, `SwatchTrigger`, and the ready-made. Exports, vite entries,
  unit `optimizeDeps`, a `colorPickerRegistry` fixture, specs (7 each).
- **React Native** `color-picker/`: ready-made only. Area and sliders are its own `PanResponder`
  drags over Zag's `Color` (`parse`, HSB); gradients by `experimental_backgroundImage`
  (`backgroundImage` on React Native Web); the alpha grid is drawn with views; adjustable thumbs
  (increment/decrement, arrow keys on the web); the eye dropper only on React Native Web where the
  browser has one. Spec `src/color-picker.spec.tsx` (6).
- **Storybook**: a `color` control kind in `scripts/prop-controls.ts` (and its spec, README).
  Stories generate from the case; story tests pass on React and Solid.
- **Suites**: `component-cases` `cases/color-picker.ts` (examples default, swatches, alpha, without
  the area, disabled, read-only; `value` state by the area thumb's ArrowRight; keyboard with arrows
  by direction). Both component-suites scenes. Browser suite: `color-pickers` section in the Panda
  fixture and a new screenshot, `colorPicker` in `RN_COMPONENTS`, indication fixtures +9 lines each
  (additions only).
- **Demo theme builder**: the Solid demo's settings panel takes its custom seed from a
  `ColorPicker` (the preset seeds as swatches, `onValueChangeEnd` updates the theme) instead of
  a text field.
- **Docs**: gap analysis (§1.5 row, §1.8 count 68, §3 zag row, the new-components table row;
  `color-picker` dropped from the optional-extras lists), READMEs (preset, binding-core, machines,
  React, Solid, React Native, Storybook).

## Tests

- `omni run build test -p` preset, anatomy, machines, binding-core, react, solid, react-native,
  component-cases: first run failed React Native's FAB stagger (reanimated, known flaky) and, after
  `-f failed`, the RN splitter's "rests where it's let go" — caused by exporting the color picker
  from the machines root (passes on main, fails with it, passes without; see open questions).
  Fixed, then `-f failed` passed (54 succeeded).
- Unit: React and Solid `src/color-picker` (14 each, two projects), React Native
  `src/color-picker.spec.tsx` (12), binding-core and preset specs, machines `index.spec`.
- Component suites (after `omni run generate prepare -p @pureform/panda-fixture`):
  accessibility, keyboard, controllable, direction, server-rendering, themes, indication with
  `-t ColorPicker` on `react/css`, `solid/panda`, `react/tailwind`: 198 passed (the first run's
  expected hexes were off by Zag's channel rounding; corrected).
- Browser suite: `visual -t color-pickers` (new screenshot, reviewed), indication fixtures
  re-recorded (additions only), parity/rn-parity/factories/rn-indication/direction
  `-t colorPicker`: 6 passed.
- Storybook: `omni run build -p @pureform/storybook-web`; story tests for `ColorPicker.stories.ts`
  on `storybook/react` and `storybook/solid` (11 each); `prop-controls.spec.ts` 14 passed.
- Solid demo: `omni run build -p @pureform/site`; `demo.e2e.test.ts -t "changes the settings"`.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, machines, binding-core, anatomy, react,
  solid, react-native, component-cases, component-suites, browser-e2e-tests, panda-fixture,
  storybook-web, solid-demo. No conflict markers.

## Merge notes

- Shared files touched additively: root `package.json` and `bun.lock` (`@zag-js/color-picker`,
  `@zag-js/color-utils`), machines `package.json`/`vite.config.ts`, preset `index.ts`,
  `pureform.ts`, `pureform.spec.ts`, `contrast.ts`; binding-core `index.ts`, `usage.ts`,
  `glyphs.ts`; bindings' `package.json`, `vite.config.ts`, `vitest.config.unit.ts`, registry
  fixtures (a new `colorPickerRegistry` at the end), `glyphs.tsx`; component-cases `cases.ts`,
  `scene.ts`; component-suites scenes; `rn-components.ts`; `visual.e2e.test.tsx`'s list.
  `generated.ts`: rerun generate.
- The gap analysis §1.8 count (68) and the "Rating, …" row in §1.5 will conflict with siblings
  that also add components; take the union and recount. Indication fixtures: re-record after
  merging if a sibling adds lines too.

## Refactoring hints

- **Helpers that look generic:** `colorPickerFraction` (binding-core) is a clamped 0–1 position
  along a length with an rtl flip, which any custom slider-like drag (RN slider, rating by drag)
  could use. React Native's `useDrag` in `react-native/src/color-picker/color-picker.tsx` (a
  `PanResponder` that reports a 0–1 point in a measured box) is the same shape as the RN
  splitter's divider and the RN slider's drag; a shared `useBoxDrag` in `react-native/src` would
  serve all three. The `gradient(image)` helper (web `backgroundImage`, native
  `experimental_backgroundImage`) belongs with rn-adapter's style helpers if another component
  draws a CSS gradient.
- **Code that looks like a sibling's:** React's and Solid's `color-picker.tsx` mirror each other
  (`hexOf`, the last-`Color` reuse, `HexField`'s draft and commit, the eye dropper's mount check);
  `hexOf` and the draft/commit could move to binding-core (`colorPickerDraft`). The draft-and-commit
  text field is what c9a's NumberField does on blur (clamping); if c9a wrote a similar helper, share
  it. React Native restates `hexOf`.
- **Suggested home:** binding-core `components/color-picker.ts` for `hexOf` (it needs Zag's
  `Color` type only) and the draft logic; `react-native/src/drag.ts` (new) for `useBoxDrag`.
- **What must not change:** `color-picker.spec.ts.snap` (preset), the `color-pickers` screenshot,
  the indication fixture lines, the component suites' ColorPicker cases, the bindings' specs.

## Open questions

- **Machines root export.** `export * as colorPicker` from `@pureform/machines`'s root made React
  Native's unit file `components.spec.tsx` fail its splitter drag test (only when run with the
  splitter's other tests; reproducible, and gone without the export). I didn't find the cause (no
  module side effects in Zag's color picker, color utils, dismissable or popper); it may be Vite's
  dependency discovery reloading mid-run. The color picker is exported from its subpath only, and
  `index.spec` checks it's not in the root. Worth a look in r9.
- **HSB rather than HCT** (above). An HCT area would fit the seed-based theming better (tone is
  what the scheme varies); it's a machine of its own. Say if wanted.
- **No form case.** The hidden input has no `form` attribute and Zag tracks fieldsets itself, so
  the forms suite's outside-form and fieldset checks would fail; the picker submits its hex by
  `name` inside a form only. A form case (and reset) is left out.
- **The eye dropper isn't in the component cases:** it renders after mounting, so hydration adds
  it. The unit specs cover it.
- **Thumbs at the ends overhang the track** by half a thumb (Zag places the centre at 0% and
  100%); the area's thumb likewise at its corners. Common in pickers; say if they should inset.
- **Keyboard steps** are Zag's (1 per arrow, Shift 10; the area's channels move from Zag's
  rounded values). The text field takes 3, 4, 6 or 8 hex digits; other CSS colors only through
  `value`.
- **React Native gradients** need React Native 0.76+ (`experimental_backgroundImage`); older
  versions draw the solid hue under the area and no slider gradients.

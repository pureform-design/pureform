# c4a: Loading indicator and wavy progress (output context)

Commits: see `git log 6138e87..c4a-loading-wavy` (preset, bindings, tests, docs).

## Built

- **Shape paths** (new `packages/preset/src/components/shape-paths.ts`, exported from the preset
  root):
    - `morphSequence(shapes: readonly ShapeGeometry[]): ShapeGeometry[]`: a cycle of
      single-contour shapes redrawn to one structure (the same number of cubic curves, one
      direction, each starting at the point closest to the previous one's start), so CSS
      `shape()` animates from each to the next. Core's `morph()` does this for a pair only.
    - `waveBand({ waves, wavelength, top, bottom, amplitude }): ShapeNode`: a band along a sine
      wave (a cubic per quarter wave, Hermite handles) from the box's start, `wavelength` px
      waves, `top`/`bottom`/`amplitude` in percent of the box's height. x is
      `min(<px>, 100%)`, so the band ends where the box does; past `waves * wavelength` it ends
      flat.
    - `wavyRing({ waves, thickness, amplitude }): ShapeNode`: an even-odd ring whose edges wave
      in and out, in fractions of the box (straight runs, 8 per wave), outer crests at the box's
      edge.
- **Loading indicator** (new `packages/preset/src/components/loading-indicator.ts`):
  `loadingIndicator`, `createLoadingIndicator(groups)`, `LOADING_INDICATOR_SHAPES` (soft burst,
  9-sided cookie, pentagon, pill, sunny, 4-sided cookie, oval, as Compose's indeterminate
  indicator) and `LOADING_INDICATOR_KEYFRAMES` (`loadingIndicatorMorph`: 8 frames, a clip shape
  and a turn each, 720° a cycle; `loadingIndicatorSpin`: a turn only). Parts `root` (48px),
  `container` (fills the root; `containerRadius` 24px), `indicator` (38px, clipped to the first
  shape, `borderRadius: when("clipShape", 0, circle)` as the fallback). Variants `variant`
  (`uncontained`, `contained`) and `color` (sets `indicatorColor`, `containerColor`,
  `containedIndicatorColor` tokens on root). Animation: 7 × `long2` on the standard curve;
  under `reducedMotion` the spin (3.5 × `long2`, linear). 0 compounds. Registered in
  `pureform()` (component and keyframes) and the preset's root.
- **Wavy progress** (`progress.ts`): a `shape` variant (`flat` default, `wavy`) on both.
    - Linear: new token `amplitude` (3px). Wavy grows the root by `2 × amplitude`, puts the
      track and stop dot on the middle line, and the indicator fills the height, clipped to
      `waveBand` (24 waves of 40px); under no clip (`when("clipShape", …)`) it stays the flat bar
      at the middle. Compound `{ shape: wavy, thickness: thick }` swaps in the thick band.
    - Circular: new token `amplitude` (1.5px). Wavy insets the track by `amplitude` and widens
      each arc's border to `thickness + 2 × amplitude`, clipped to `wavyRing` (9 waves).
      Compounds: wavy + thick (thick ring on the arcs), wavy + indeterminate (the root spinner
      widened and clipped), wavy + indeterminate + thick.
- **Shape exception:** `radii.spec.ts`'s `ALLOWED` has `loadingIndicator` →
  `tokens.containerRadius` with its reason. `pureform()` skips the theme's corner style for
  `loadingIndicator` (one `continue` in the corner loop), so the container stays a circle under
  a squircle theme.
- **binding-core:** `components/loading-indicator.ts`: `LoadingIndicatorPart`,
  `LoadingIndicatorVariantProps`, `LoadingIndicatorRootOwnProps`, `LOADING_INDICATOR_ROOT_PROPS`,
  `loadingIndicatorSelection(props)`, `loadingIndicatorRootProps()` (`role: "progressbar"`, no
  value). Progress: `shape` in `ProgressVariantProps`, `PROGRESS_ROOT_PROPS` and
  `progressSelection`. `usage.ts`: `loading-indicator` (`variant`, `color`) and `shape` on both
  progress entries.
- **Bindings:** `@pureform/{react,solid}/loading-indicator` (`LoadingIndicator` ready-made, with
  `Root`, `Container`, `Indicator`), `@pureform/react-native/loading-indicator`
  (`LoadingIndicator`, drawing the indicator with the engine's `Drawing`). React Native's
  `LinearProgress` draws its indicator with `Drawing` too (the wave with an SVG engine). Registry
  fixtures, `package.json` exports and `vite.config.ts` entries in each.
- **Tests:** preset `loading-indicator.spec.ts` (morph structure, keyframes, reduced motion,
  fallback, colours, wavy variants and compound counts), snapshots, `pureform.spec.ts` lists;
  React/Solid `loading-indicator.spec.tsx`; React Native `loading-indicator.spec.tsx` (circle
  without SVG, path with it, the wavy bar's fallback and SVG drawing) and `components.spec.tsx`;
  component suites (`loadingIndicator` case, wavy progress examples: themes, direction,
  hydration, accessibility run on them); browser suite: a `loading-and-wavy` screenshot section
  (base and teal themes), `reduced-motion.e2e.test.ts` checks the loading indicator's
  `animation-name` (morph, or spin under every reduced-motion scenario) on Panda, CSS and
  Tailwind; `rn-parity` covers `loadingIndicator` (skipping clip fallbacks, as for shapes).

## Deviations from the design

- **React Native doesn't morph.** rn-adapter's keyframes drop `clipPath`, so the indicator turns
  in its first shape with an SVG engine, and as a circle without one. The circular wavy arcs are
  borders, which the SVG `Drawing` doesn't draw, so React Native's circular wavy falls back to
  flat; the linear wave is drawn with an SVG engine.
- **The wave is fixed per thickness.** A clip's points are numbers, so the wave's geometry is
  drawn from the default tokens (linear: 4 or 8px bar, 3px amplitude; circular: 4 or 8px on a
  48px circle, 1.5px amplitude, scaling with `size`). Retuning `amplitude` or `height` moves the
  boxes but not the clip. Hence 4 compounds (linear 1, circular 3): the preset's count goes from
  21 to 25 (§1.8 / design doc §5.5 left to the merge).
- **The circular wave's phase** turns with each arc (the clip sits on the rotating arc), so the
  two halves' waves can meet out of step at the bottom by up to the amplitude.
- **Determinate waves don't travel** (M3 animates the phase); the indeterminate linear wave
  slides with its indicator. A wave longer than 960px ends flat.
- **The loading indicator under reduced motion** keeps a turn (the indeterminate-progress rule)
  and drops the morph.
- `pureform.ts`'s corner loop skips `loadingIndicator` (outside the phase's own files, a
  one-line edit). The circular progress (also a shape exception) still takes the theme's corner
  style; left alone.

## Stubs and gaps

- React Native morph and circular wave (see above): an rn-adapter feature (clip shapes in
  keyframes for the SVG engines, and a stroked drawing), for r4 or later.
- Compose's loading indicator also scales the shape slightly per step and offers custom
  polygons; neither is here.

## How to verify

Ran (targeted):

- `cd packages/preset && bunx vitest run` (511 pass); `bunx tsc --noEmit -p tsconfig.json` in
  preset, binding-core, react, solid, react-native, component-suites, browser-e2e-tests,
  panda-fixture (clean).
- `omni run build test -p` preset, anatomy, binding-core, react, solid, react-native,
  rn-adapter, css-adapter, tailwind-adapter, panda-adapter `-o continue`: all succeeded.
- `bunx vitest run -c vitest.config.unit.ts src/loading-indicator` in react, solid,
  react-native.
- `omni run test:e2e -p @pureform/component-suites`: passed (a first run under load had 3
  Autocomplete `controllable` failures, which passed on `-f failed`).
- `omni run test:e2e -p @pureform/browser-e2e-tests`: passed (visual with the new screenshot,
  reduced motion, parity, rn-parity, direction, indication).
- `bun install --frozen-lockfile`: no changes (no new packages).

## Notes for the next phases

- Files outside c4a's own touched: `packages/preset/src/pureform.ts` (registration and the corner
  loop's skip), `radii.spec.ts` (allow-list entry), `pureform.spec.ts`, `new-components.spec.ts`,
  `index.ts`; `tests/browser-e2e-tests/src/rn-parity.e2e.test.ts` (`SHAPED` takes the name and
  skips the wave's fallback box), `reduced-motion.e2e.test.ts` (an added describe),
  `rn-components.ts`, `visual.e2e.test.tsx`; `tests/panda-fixture/src/page.tsx` (a new
  `loading-and-wavy` section after `progress`; the `progress` screenshot is unchanged);
  React Native's `progress.tsx` and `components.spec.tsx`. The registration files are one-line
  additions.
- The gap analysis rows were padded by hand; §1.8 totals and the design doc's compound count are
  the merge's.
- The screenshot runs under reduced motion, so it shows the spin's first frame (the first shape).

## Refactoring hints

- **Helpers that look generic:**
    - `morphSequence` (`shape-paths.ts`) repeats core's private `toCurves`, `halve`, `splitTo`,
      `area`, `reversed`, `fromCurves` (`packages/core/src/ast/helpers/shape.ts`). Core's `morph()`
      is `morphSequence([a, b])` but for the closing alignment; move `morphSequence` into core and
      build `morph` on it.
    - `waveBand` and `wavyRing` are generic clip builders (a wavy divider, a wavy slider track, an
      expressive carousel indicator). Their home is core's shape helpers or a preset
      `shape-paths.ts` kept as is.
    - `loadingIndicatorRootProps` is `progressRootProps` without a value; a shared
      `progressbarProps(value?)` would serve both.
- **Code that looks like a sibling's:** the React/Solid `LoadingIndicator` files copy the circular
  progress's part factory (`part(name, label)` around `scope.render`); every no-machine compound
  component repeats it (progress, drag handle, separator). The React Native `Drawing` placement
  (`engine.Drawing ? <Drawing drawing={selected.drawings.x} /> : null`) is the icon button's and
  the FAB's. c4d's carousel masks may want `morphSequence` or a shape clip on items.
- **Suggested home:** `packages/core/src/ast/helpers/shape.ts` for `morphSequence` (and the wave
  builders if r4 wants them in core); a `noMachineParts(anatomy, context)` helper in each web
  binding's `parts.tsx`; an `SvgDrawing` slot helper in react-native's `parts.tsx`.
- **What must not change:** `new-components.spec.ts.snap` (`loadingIndicator`, both progress
  recipes), `LOADING_INDICATOR_KEYFRAMES` (its frames' structure), the `loading-and-wavy`
  screenshot, the reduced-motion and rn-parity specs, `JSON.stringify(pureform())`.

## Open questions

- Values unconfirmed against m3.material.io: the loading indicator's 48/38px sizes, colours
  (`primary`; contained `primaryContainer`/`onPrimaryContainer`) and pace (Compose's ~650ms per
  shape, here `long2` × 7 on the standard curve); the wave's 3px (linear) and 1.5px (circular)
  amplitude, 40px wavelength, and 9 waves around the circle.
- Should the circular progress skip the theme's corner style too (it is the other shape
  exception)? It would change its output under squircle themes.
- Should a wavy indicator's wave travel (M3 moves its phase)? It needs a clip-path keyframe per
  thickness, which roughly doubles the wave's CSS.
- Should `amplitude` stay a token, since the clip doesn't follow it? It sizes the boxes, so a
  change has to come with a matching clip.

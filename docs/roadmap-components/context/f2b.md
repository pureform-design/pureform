# f2b: Controls (output context)

Branch `f2b-controls`, from main `fdbae596`. Commits: `git log fdbae596..f2b-controls`.

| Commit     | What                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
| `6515b770` | test(react-native): the toolbar's "keeps every element…" waits for the measured row      |
| `98c6d3dd` | fix(preset): a shaped outlined icon button's ring follows its `outlineWidth`             |
| `38bb37a9` | feat(preset): the slider's `handleClearance` component token, replacing `handleGap`      |
| `bc2c0c39` | feat(slider): bindings read the theme's handle clearance; styled web e2e for the cut-off |
| `fad25bc3` | fix(toolbar): an unstyled toolbar is vibrant by the provider's default `color` too       |
| `cbaab15e` | feat(preset): the field label floats on `spatialFast`                                    |
| `1ada268f` | docs: architecture §5.8 motion list and the preset README                                |

This file is the last commit.

## What changed

- **Flaky toolbar test** (`packages/react-native/src/toolbar/toolbar.spec.tsx`): until the row is
  measured, the React Native toolbar shows every element _and_ the overflow button, so
  `shown() == [a, b, c]` passed before the measure and the overflow button's width was read too
  early. The test now waits for both in one `until`. No component change.
- **Shaped outline ring** (`shaped.ts`, `icon-button.ts`): `shapeVariant` takes
  `outline: { color, width }` instead of `outlineColor` and an `outlineWidth` defaulting to 1px
  (the default is gone: the one caller with an outline passes it). The icon button passes its
  `outlineWidth` token (1/2/3px by size), so the clipped ring and the fallback border agree. The
  ring's points now carry `calc(… + var(--components-iconButton-outlineWidth, 1px) * k)`.
  Snapshot: `icon-button`. (The phase says "focus ring"; the user confirmed it means this outline
  ring, by the icon button's `outlineWidth`. The focus ring already used the theme's thickness.)
- **Slider handle clearance** (`preset/src/components/slider.ts`): `handleClearance: px(8)`
  (half the bar handle's 4px and Compose's 6px gap) replaces `handleGap`, which only fed it.
  `CLEARANCE = bar × handleClearance`. Same computed output. Snapshot: `new-components` (slider).
- **Bindings read it** (binding-core `components/slider.ts`, `dom.ts`):
  - `SliderInsetIconMeasures` gains `clearance`; `sliderInsetIconOverflows` uses it.
  - `sliderClearanceOf(offset, endGap)`: the clearance from how far the inactive track starts past
    the active track's end.
  - Web `readSliderInsetIcon` reads it from the inactive track sibling
    (`[data-pf-part="track"]`), only while that track has no running animation; otherwise it
    keeps `last` (new option), then the default. React and Solid pass `last`.
  - React Native `sliderInsetIconMeasuresOfStyle({ insetIcon, track }, …)` (was a single style)
    reads the track's start margin (selection moves the pixel part of an inset there).
  - `sameSliderInsetIcon(a, b)` replaces the three hand-written size/padding comparisons.
  - A round handle (`bar` 0) now reads a clearance of 0, which is what its styles draw; before,
    the bindings assumed 8.
- **Toolbar** (binding-core `components/toolbar.ts`, React and Solid `toolbar.tsx`):
  `unstyledToolbarProvidedTokens(props, defaults)` decides vibrant from
  `withDefaults(defaults.toolbar, toolbarSelection(props)).color`, so a provider's
  `defaults: { toolbar: { color: "vibrant" } }` counts. Replaces the `(color)` signature. React
  Native already resolves its selection over the defaults.
- **Text field label** (`field.ts`): `labelTransition` floats on `spatialFast` (overshoots under
  expressive, as Compose's `FastSpatial`), replacing f1b's `effectsDefault`. Colors stay on their
  tween; property order unchanged. `spring-motion.spec.ts` updated; snapshots: text field, text
  area, autocomplete, select, tags input, date input, docked date picker (only the spring name
  changes).

## Tests added

- binding-core `display.spec.ts`: the React Native reader with a track margin (14px clearance),
  the cut-off with a 14px clearance, `sliderClearanceOf` with no gap or no read.
- `tests/component-suites/src/slider-inset-icon.e2e.test.ts` (new, styled web): the icon in by its
  padding while it fits, past the handle's gap once it doesn't, and a provider override
  `components.slider.handleClearance: 14px` moving the cut-off (13% of 400px fits at 8, not at 14).
- React Native `components.spec.tsx`: the same 13% case with a provider override.
- React and Solid `toolbar.spec.tsx`: "is vibrant by the provider's default color too".

## Checks

- Fresh setup: `bun install`, `omni run build`; `omni run prepare -p @pureform/panda-fixture`
  (the Panda projects need `.pureform/`, which `build` doesn't write).
- `omni run build test -p` preset, binding-core, react, solid (then `-f failed` after the slider
  snapshot); `omni run build -p @pureform/react-native`.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, binding-core, react, solid, react-native.
- React Native (Vitest, `vitest.config.unit.ts`): `toolbar/toolbar.spec.tsx` (14 passed),
  `components.spec.tsx -t slider`.
- component-suites, `react/css`, `solid/panda`, `react/tailwind`: `slider-inset-icon` (9 passed);
  `themes` and `direction` with `-t "Slider|TextField|Text field|Toolbar|IconButton|Icon button"`
  (261 passed).
- browser-e2e-tests: `reduced-motion -t textField`, `provided-tokens`, `visual` (55 passed, no
  screenshot changed).

## Refactoring hints

- **Helpers that look generic:** `sliderClearanceOf` and the "read only while not animating"
  check in `readSliderInsetIcon` (`dom.ts`): any layout read of a theme length that a transition
  can be moving. `sameSliderInsetIcon` is slider-only.
- **Code that looks like a sibling's:** `unstyledToolbarProvidedTokens` now resolves the
  selection over the provider defaults itself; any other "unstyled but still provides" component
  (app bar, paginator if they gain `unstyled`) would do the same.
- **Suggested home:** leave in binding-core until a second user.
- **What must not change:** the snapshots listed above, `slider-inset-icon.e2e.test.ts`,
  `reduced-motion.e2e.test.ts`, the `visual` screenshots.

## Open questions

- The web clearance read relies on the inactive track being the icon's sibling with
  `data-pf-part="track"` and being at rest at least once (it is on mount). A theme switch while
  the track animates keeps the previous clearance until the next read.
- The shaped ring's `calc()` per point makes the outlined icon button's CSS a little bigger
  (one `var()` per point, per shape a page uses).
- `docs/roadmap-components/next.md` §2 still lists the slider cut-off following the theme; the
  merge can drop that entry.

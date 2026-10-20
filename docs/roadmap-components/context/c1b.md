# c1b: Progress (output context)

Commits: see `git log main..c1b-progress`.

## Built

- `packages/preset/src/components/progress.ts`
    - **Linear:** parts `root, track, indicator, stopIndicator`. `root` is now a plain clip box
      (no colour). `track` is absolute, starts at `value% + gap` (`insetInlineStart`) and ends at
      the root's end, so the indicator-to-track gap is the `gap` token (4px); at a full value
      its start passes its end and nothing shows. `stopIndicator` is a `stopSize` (4px) dot at
      the end, centred on the height. New tokens: `gap`, `stopSize`. `indeterminate` puts the
      track at inset 0 and hides the dot. The `color` variant moves the container colour to
      `track` and gives the dot the main colour. `thickness: thick` now sets the `height` token
      (so the dot stays centred) instead of the root's height.
    - **Circular:** parts add `track, trackEndHalf, trackEndArc, trackStartHalf, trackStartArc`
      (10 total). The track is the same two-half ring as the indicator, in `trackColor`, rotated
      to `(value + gap)` percent of the circle and drawing `100 - value - 2*gap` percent. New
      tokens: `trackColor`, `gap` (percent of the circle, default 3). Hidden while indeterminate.
      `thickness` and colour variants cover the track.
- Anatomy regenerated (`packages/anatomy/src/generated.ts`).
- Bindings (React, Solid, React Native) render the new parts; compound parts `Track`,
  `StopIndicator`, `TrackEndHalf`, `TrackEndArc`, `TrackStartHalf`, `TrackStartArc` on the
  web bindings. binding-core types/comments updated. Registry fixtures updated.
- Specs: preset (new-components, expressive, snapshots), react and solid progress specs.
- Docs: gap analysis rows (§1.2 matrix, §2.2, §6 row 4, §7), READMEs.

## Deviations from the design

- Circular `radii.spec.ts` allow-list: **no entry added.** Circular arcs use `circle` (`50%`),
  not a fixed px radius, so the spec doesn't report one and a stale entry would fail it.
- Compound count: unchanged (the `color` variant stays one group; no new compounds).
- Deprecated options: progress had none.
- Circular track ends are flat (the arcs are borders), as the active arcs are; round caps are
  not drawn.
- At value 0 the linear track still starts `gap` in from the start (React Native can't take a
  `min(px, ...)` mixed with percentages, so the gap isn't closed up at 0).

- Under right to left every circular arc (indicator and track) and the track's turn now rotate
  the other way (`when("rtl", …)`), so the ring mirrors; the direction suite needed it. This changes
  the existing indicator arcs' RTL transform (their bounding boxes were unchanged).
- `packages/rn-adapter/src/factory.spec.ts` (outside ownership): the linear progress's moving
  slots are now `track` and `indicator`.

## Stubs and gaps

- Wavy progress: c4a.

## How to verify

- `cd packages/preset && bunx vitest run`; `bunx tsc --noEmit -p tsconfig.json` in anatomy,
  binding-core, preset, react, solid, react-native.
- Targeted only (the orchestrator runs the full suite): `omni run test:unit -i` for binding-core,
  react, solid, react-native, rn-adapter, css/tailwind adapters; `omni run test:e2e -p
@pureform/component-suites --arg='-t=Progress'` and the same for browser-e2e-tests. Adapter
  `codegen`/`factory` sampled specs time out under load (60s/120s) as at baseline.

## Notes for the next phases

- Files outside c1b's list that were touched: `tests/panda-fixture/src/page.tsx` (renders the
  new parts), `packages/{react,solid}/src/__fixtures__/registry.ts`, `packages/binding-core/src/components/progress.ts`
  (types), and the progress binding/spec files of react, solid, react-native.
- RN's calc allows a percent plus pixels only as an inset (not width), and min/max take one unit.
  Slider (c1g) reusing the gap should use insets the same way.

## Refactoring hints

- **Helpers that look generic:** the linear `track` inset-by-`value% + gap` pattern and the
  `stopIndicator` dot (`progress.ts`) — slider (c1g) stop indicators and its track pieces want
  the same. The circular two-half `half`/`arc` builders (local to `createCircularProgress`) are
  also what c4a's loading/wavy circular would reuse.
- **Code that looks like a sibling's:** slider track/activeTrack (c1g).
- **Suggested home:** `packages/preset/src/components/shared.ts` (`trackGap`, `stopDot`
  helpers); the half/arc builders in a `progress-ring.ts` next to it.
- **What must not change:** `new-components.spec.ts` snapshots for the progress components, the
  RN resolved styles, visual screenshots of the progress section.

## Open questions

- Gap defaults (4px linear, 3% circular ≈ 4dp at 48dp size) are taken from the Android docs'
  values by feel; not confirmed against m3.material.io.
- The circular track needs five extra parts because a single element can't draw an arc with a
  gap at both ends on every target; an SVG-based version could fold them into one.
- Should the gap close at value 0 on the web (CSS `min()` works there)?

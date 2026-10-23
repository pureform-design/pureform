# r9b: Motion (output context)

Branch `r9b`, from main. Commits: `git log --oneline main..r9b`. Not pushed; main untouched. The
batch was interrupted once; its `wip: before interruption` commit (browser tests for wavy
progress) was finished and folded into `r9b: browser tests for wavy progress motion…`.

## Built

- **Shared axis clipping** (`954d3501`): `horizontal-shared-axis` clips its root only while pages
  move (`binding-core/src/components/page-transition.ts`, preset), so content can overflow at
  rest. Tests: preset spec, each binding's `horizontal-shared-axis.spec.tsx`.
- **Exact springs on the web** (`f7183b96`): springs' stiffness, damping and mass are written as
  CSS vars beside the sampled duration and `linear()` easing (`css-lowering/src/spring.ts`,
  `styling/src/tokens.ts`); the sheets' drag settles read them (`binding-core/src/settle.ts`,
  `sheet-drag.ts`, `side-sheet-drag.ts`, React and Solid sheets). Tests: `spring.spec.ts`,
  `tokens.spec.ts`, `settle.spec.ts`; Panda's `preset.spec.ts` (snapshot and the theme override's
  vars) updated in `r9b: preset and Panda specs…`.
- **List item swipe settling** (`146ab833`): a released swipe settles from its release speed on
  the exact spring (`binding-core/src/list-item-swipe-settle.ts`, React and Solid `swipe.ts`).
  Tests: `settle.spec.ts`, both bindings' `list-item.spec.tsx`.
- **Splitter transitions doc** (`52bd1e9d`): React and Solid READMEs say the snap overrides a
  pane's own transition and an inline one is put back after (`binding-core/src/settle.ts`).
  Test: `settle.spec.ts`.
- **TimePicker hand** (`5e7dc850`): on React Native the hand springs the short way on tap,
  release and keys; on the web the handle follows the hand along a motion path. Tests: machines
  `time-picker.spec.ts`, React and React Native `time-picker.spec.tsx`.
- **Wavy progress like Compose** (`c8a35ef2` + tests commit): the indeterminate linear wave
  travels along the track (the root clips to a travelling wave, a compound
  `shape: wavy × indeterminate: true`; the bar fills under it); the circular arc grows from 10%
  to 87% and back as it turns. Tests: preset `new-components.spec.ts`,
  `loading-indicator.spec.ts` (updated: linear now has that one compound, circular none),
  browser `progress-motion.e2e.test.ts` (Panda, CSS, Tailwind) and two new
  `direction.e2e.test.ts` fixtures (circular arc growing and shrinking). The Panda fixture page
  renders the wavy indeterminate line and the circular spinner with its arcs so Panda extracts
  them. Fixes on resume: the browser test passes `indeterminate: true` as a boolean (Panda's
  compound matches booleans), and the direction fixture leaves out the track, which is hidden
  while indeterminate and has no box to mirror.
- **SVG engine off React's frames** (`rn-adapter/src/svg.ts`): `useTween`'s per-frame `setState`
  is gone.
    - Shape morph: on the web the browser runs it, CSS `d: path()` through `element.animate`
      with the transition's easing (springs are already sampled into `linear()`), SMIL
      `<animate>` with 30 samples of the curve where `d` doesn't animate. On a device Animated
      writes `d` with `setNativeProps`, no React state. A morph interrupted mid-way starts from
      where it was; a path mounting mid-morph joins it at the same time.
    - Fill: an opacity cross-fade of two stacked paths (`drawingSvg`'s new `fadeFrom`/`fadeIn`);
      two commits per change (start and end), none per frame.
    - Ripple: drawn at its final size; on the web its group's transform and opacity run through
      `element.animate` (`useBrowserRipple`, extracted from `WebDisc` in
      `animate/ripple.ts`); on a device an `Animated.View` per ripple on the native driver.
    - README recommends `reanimated-svg` for morphing shapes on devices.
    - Tests: `react-native/src/engines/svg.spec.tsx`: running browser animations on the paths
      and ripple, no attribute writes from JavaScript during them, at most 3 commits, end state
      the target `d`, fill and opacity with one path left; existing motion-engine, loading
      indicator and indication specs pass.

Checks: `omni run build test -p @pureform/rn-adapter -p @pureform/react-native -p @pureform/preset`
(with `-f failed` reruns); the only failures left are React Native's splitter "rests where it's
let go…" (passes alone; the order-dependent flake r9d owns) and once the table's "sorts by a
header's button" (opacity mid-transition, passed on rerun). `tsc` clean in rn-adapter,
react-native, browser-e2e-tests' touched files; `omni run build -p @pureform/storybook-web`
passes.

## Refactoring hints

- **Helpers that look generic:** `useBrowserRipple` (`rn-adapter/src/animate/ripple.ts`) runs any
  ripple's grow and fade through `element.animate`. `browserRun`/`animatedRun`
  (`rn-adapter/src/svg.ts`) wrap "the browser's animation or Animated writing native props" with
  a progress read for interruption; another engine path writing native props could use them.
- **Code that looks like a sibling's:** `nativeSvgRipple` repeats `NativeDisc`'s transform
  interpolation, and `svgRipple`'s gradient placement.
- **Suggested home:** keep in `rn-adapter`; move `browserRun`/`animatedRun` to `animate/` if a
  second user appears.
- **What must not change:** `svg.spec.tsx`, `progress-motion.e2e.test.ts`, direction fixtures.

## Open questions

- On devices SVG ripples clip to the surface's corners (the layer's `overflow: hidden` and
  radius), not to an arbitrary drawn shape: a native-driven view can't sit inside the SVG's clip
  path. `reanimatedSvg` keeps the exact clip.
- The fill cross-fade equals the old colour blend only when the under colour is opaque; a
  translucent fill shows slightly more of the background mid-fade.
- Device paths (native-driver ripple, `setNativeProps` morph) weren't run on a device here; only
  the web build is tested.

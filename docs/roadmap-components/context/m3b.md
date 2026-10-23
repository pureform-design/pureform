# m3b: Horizontal shared axis (output context)

Branch `m3b`, from main `a94bbe0b`. Commits (`git log a94bbe0b..m3b`):

| Commit     | What                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `cad1503e` | feat(preset): `horizontalSharedAxis`, Compose's shared axis with its luminance-based scrim             |
| `bb0eebf4` | fix(preset): the pages and scrim sit in the root (`structure`), anatomy regenerated                    |
| `51b28f27` | feat(binding-core): the pages, direction and `PageTransitionProps` on tabs' and stepper's content      |
| `b9a7617d` | feat(react): `HorizontalSharedAxis`, `transition="sharedAxis"` on tabs and a row stepper               |
| `5801df94` | feat(solid): the same                                                                                  |
| `e1ffbcff` | feat(rn-adapter): the animated entry exports `animate`, `NATIVE_DRIVER`; binding-core's slide and fade |
| `36bc5f35` | feat(react-native): `HorizontalSharedAxis` on Animated, `transition="sharedAxis"` on a row stepper     |
| `394017d4` | fix(preset): the scrim opacity is a percentage, which `colorMix` takes                                 |
| `5b0c87be` | test(suites): `shared-axis.e2e.test.ts`, shared-axis examples in the tabs and stepper cases            |
| `e4efb4e7` | docs: gap analysis (§1.7 row, §1.8 count 65, §7 row) and READMEs                                       |

This file is the last commit. The README isn't ticked (the merge does).

## Source

Compose `MaterialTransitions.kt` (androidx-main): `HorizontalSharedAxis.forwardTransform()`
slides the incoming content in from `+0.2 × width` and the outgoing out to `−0.2 × width`;
`backwardTransform()` mirrors it and draws the target below (`targetContentZIndex = -10`);
`FadeAnimationSpec = tween(90, delay 50, LinearEasing)` both ways. `scrimColor` is
`colorScheme.scrim` at alpha 0.8 when `surface.luminance() < 0.5`, else 0.2; Compose uses it only
as the predictive-back veil. Predictive back stays out (next.md §0).

## Done

- **Preset** (`packages/preset/src/components/horizontal-shared-axis.ts`):
  `createHorizontalSharedAxis(color?)`, `horizontalSharedAxis`, slots `root` (isolated, relative,
  `overflow: clip`), `page`, `scrim`; tokens `slideSpring` (`spatialDefault`), `fadeDuration`
  (90ms), `fadeDelay` (50ms), `scrimColor` (`scrim`), `scrimOpacity`. Pages animate on
  `[data-state=entering|leaving][data-direction=forward|backward]` raw rules: a physical slide
  (`SHARED_AXIS_KEYFRAMES`: `sharedAxisFromRight/FromLeft/ToLeft/ToRight`, 20%) on the spring
  alongside the overlays' `overlayFadeIn/Out` (entering `both`, leaving `forwards`); `_rtl` picks
  the mirrored keyframes; `_motionReduce` keeps the fade alone. z-index: forward entering 2 over
  leaving 0, backward the reverse; the scrim is 1 between them, fading in forward and out backward
  on the slide spring. `pureform()` passes `theme.color`, so `scrimOpacity` is the surface's
  luminance per scheme (`when("dark", 80%, 20%)` for the default theme), falling back to the
  scheme when the surface isn't a plain color. Keyframes registered in `pureform.ts`. 0 compounds.
- **binding-core** (`components/horizontal-shared-axis.ts`): props/selection, the page model
  (`sharedAxisStart`, `sharedAxisChange`, `sharedAxisSettle`, `sharedAxisMoving`,
  `sharedAxisDirection`), `sharedAxisPageProps` (leaving page `inert` + `aria-hidden`),
  `sharedAxisScrimProps`, `PageTransitionProps` (`transition: "none" | "sharedAxis"`,
  `transitionScrim`) added to `TabsContentProps` and `StepperContentProps` (and their `*_PROPS`),
  `SHARED_AXIS_SLIDE_FRACTION`, `SHARED_AXIS_FADE`. Usage: a `horizontal-shared-axis` entry; tabs
  and stepper also draw `horizontalSharedAxis`.
- **React / Solid** (`src/horizontal-shared-axis/`): `HorizontalSharedAxis` (`index`, `scrim`,
  tokens, `testId`, `unstyled`, `as`) and `useSharedAxisPage()`. The old page is kept until its
  own `getAnimations()` finish (none: at once). Solid's children may be a function of the index
  so a leaving page keeps its own content; Solid waits a frame before reading the animations.
  Tabs' and stepper's `Content` stay shown (`hidden: false`) while leaving. The ready-made `Tabs`
  and a horizontal `Stepper` render the selected panel in a shared axis under
  `transition="sharedAxis"`.
- **React Native** (`src/horizontal-shared-axis/`): same API (no `as`), on Animated (every
  engine): `translateX` of ±0.2 × the measured width on `themeSpring("spatialDefault")`, opacity
  90ms after 50ms, `timeScale` honoured, mirrored under rtl, fade only under reduced motion; the
  scrim is an Animated view. A row `Stepper` takes `transition`/`transitionScrim`. RN tabs have no
  panels, so no option there.
- **Native scrolling:** nothing scrolls or snaps; the root clips.
- **Deprecated options:** none existed on the tabs or stepper to replace; nothing removed.

## Checks

- Fresh setup: `bun install`, `omni run build`.
- `omni run build test -p` preset, anatomy (after `omni run generate -p @pureform/anatomy`),
  binding-core, rn-adapter, react, solid, react-native, component-cases: pass (two preset
  timeouts under load passed on `-f failed`).
- Vitest unit: React and Solid `src/horizontal-shared-axis`, `src/tabs`, `src/stepper`; React
  Native `src/horizontal-shared-axis`, `src/stepper`: pass.
- e2e (`omni run generate prepare -p @pureform/panda-fixture` first),
  `tests/component-suites`: `shared-axis.e2e.test.ts` on `react/css`, `solid/panda`,
  `react/tailwind` (5/5 each); `direction`, `server-rendering`, `accessibility` with
  `-t "shared axis"` on `solid/css` and `react/panda`: pass. `tests/browser-e2e-tests`
  `panda-factories.e2e.test.ts -t horizontalSharedAxis`: 6 passed.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, binding-core, react, solid,
  react-native, rn-adapter, component-cases, component-suites. No conflict markers.

## Refactoring hints

- **Code that looks like a sibling's (m3a):** m3a's `FadeThrough` wraps content that changes
  (`key`/`value`) the same way: keep the outgoing child, mark entering/leaving, drop it when its
  animations end. Here that is React's/Solid's `Root` + `Page` in
  `packages/{react,solid}/src/horizontal-shared-axis/horizontal-shared-axis.tsx`, RN's in
  `packages/react-native/src/horizontal-shared-axis/`, and the page model in binding-core
  (`sharedAxisStart/Change/Settle`). A generic `pageTransition` model (pages keyed by an id, a
  direction that may be absent for fade through) and one binding wrapper parameterised by the
  anatomy would serve both. Suggested home: `packages/binding-core/src/components/page-transition.ts`
  and a `transition-pages.tsx` beside each binding's `presence`.
- **Waiting for a page's animations:** `Promise.all(el.getAnimations().map(a => a.finished))`
  in both web bindings; binding-core `/dom` could hold `animationsEnd(element)` (the suites'
  `animationsDone` is the test-side twin).
- **`useSharedAxisPage()` + `hidden: false`** in tabs' and stepper's `Content` (4 places): a
  helper in each binding (`leavingContentProps(machineProps)`) if m3a puts the navigation's
  content in a transition too.
- **`PageTransitionProps`** is the natural place for m3a's `"fadeThrough"` value on the
  navigation bar/rail content.
- **What must not change:** the preset spec `horizontal-shared-axis.spec.ts`, the e2e
  `shared-axis.e2e.test.ts`, the binding specs above, and `SHARED_AXIS_KEYFRAMES` names.

## Open questions

- **The scrim's role:** Compose uses `scrimColor` only as the predictive-back veil. Without
  predictive back, `scrim` veils the page underneath during a normal change (dims the old page
  going forward, lifts off the new one going backward). Confirm or drop it.
- **Scrim and named themes:** the luminance is read from the base theme's surface; a named theme
  with a different surface keeps the base's opacity (it can set `scrimOpacity`).
- **React Native timing:** the native pages use the theme's `spatialDefault` and the fixed 90/50ms
  fade, not an instance's `slideSpring`/`fadeDuration` tokens.
- **A change during a change:** the page still entering becomes the leaving one and its animation
  restarts from its start (a small jump), as the page model keeps at most two pages.
- **Rows only:** the stepper's option applies to a horizontal stepper; a vertical one's content
  sits in each item.
- **Screenshots:** no visual-suite section or RN parity entry was added: at rest the shared axis
  draws only its page; a mid-transition screenshot would depend on timing. Say if one is wanted.
- **Static and dynamic theme rows:** checked only through the default theme (the scrim's color and
  opacity are theme tokens); no dynamic-theme scene was added.

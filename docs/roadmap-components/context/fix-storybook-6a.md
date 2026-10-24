# fix-storybook-6a: progress and web

Storybook findings, section 6a of [fix-storybook-6](../phases/fix-storybook-6.md), on branch
`fix-storybook-6a` from main `a835d9ad`. Each item was first reproduced with `storybook dev -p 6461`
and Playwright (screenshots over time, computed styles sampled every frame, pointer sweeps) in
Solid, React and, where it applies, React Native. Not pushed.

## Items

### CircularProgress loses its track while indeterminate

- **Cause:** the preset's `indeterminate: true` hid the track (`display: none`), from when the
  spinner was a fixed half circle. Since r9b the arc's length is the animated `value` token, and
  the track is already computed from `value` (turned to `value + gap`, drawing
  `100 − value − 2·gap`), so it can follow the arc.
- **Layer:** component (preset `progress.ts`), every target; React Native too (checked: the
  track shows behind its half-circle spinner).
- **Fix:** the indeterminate variant no longer hides the track. It turns with the root and keeps a
  gap at each end of the growing and shrinking arc.
- **Compose:** Compose's flat `CircularProgressIndicator` uses a transparent track while
  indeterminate (`circularIndeterminateTrackColor`); the wavy one and the linear ones draw theirs.
  The finding asked for a track, so both shapes keep it here (see open questions).
- **Tests:** preset `loading-indicator.spec.ts` ("keeps the circular track while indeterminate…"),
  `new-components.spec.ts` (updated: the indeterminate variant sets no track style; snapshot);
  browser `progress-motion.e2e.test.ts` (Panda, CSS, Tailwind): the track shows and its turn is
  `(value + 3) × 3.6°` at a paused frame; `direction.e2e.test.ts`'s indeterminate circular fixture
  now includes the track (it mirrors).

### Wavy CircularProgress: the seam between the halves misaligned

- **Cause:** each arc's ring was clipped to the wavy ring, and the arcs turn (`-135° + …` for the
  end half, `45° + …` for the start half), so each half's wave turned with its arc. Their waves
  were out of phase at the seams whenever the two turns differed by other than a multiple of 40°
  (nine waves): half a wave at rest (180° apart), and drifting while the value or the spinner
  moved.
- **Layer:** component (preset `progress.ts`, `shape-paths.ts`).
- **Fix:** the halves clip instead of the arcs: `wavyRing` takes `half: "left" | "right"` and
  draws its points for a box that is that half of the circle (x doubled, the right half shifted
  by the circle's middle; the lengths from the tokens unchanged). `endHalf` clips to the right
  half's share and `startHalf` to the left (swapped under right to left), so the wave stays put
  in the circle's frame and the arcs only reveal it; both halves cut one ring, so it's
  continuous across the seam. The spinner turns as a whole, wave included.
- **Tests:** `loading-indicator.spec.ts` ("rings a half's box with its share of the circle…", and
  "clips the circular halves to one wavy ring…" replacing the arcs' clip test);
  `progress-motion.e2e.test.ts` "keeps the wavy circular halves' wave in the circle's frame":
  the halves clip, the arcs don't, the end half's ring starts on its left edge and the start
  half's on its right, on the seam. Screenshot of 75% wavy: continuous at the bottom seam.

### Linear (and circular) progress: the track runs under the indicator

- **Already right:** the determinate linear and circular tracks start after a gap (flat and wavy),
  checked in Solid, React and React Native. The circular indeterminate now keeps its gaps (above).
- **Cause (indeterminate linear):** the track filled the whole bar, so the sliding indicator,
  flat or wavy, sat on it with no gap; Compose draws the track only outside the indicator and its
  gaps.
- **Layer:** component (preset `progress.ts`), web only.
- **Fix:** while indeterminate, the track's color is a gradient with a transparent window from
  the indicator's start less `gap` to its end plus `gap`. The track runs the same easing and
  duration as the indicator through new keyframes `linearProgressTrackGap` / `…Rtl`, which only
  animate the registered `slide` token (the indicator's own keyframes set `slide` too), so the
  window follows the bar. It's raw CSS (`rawRules`), so React Native keeps the whole track (no
  gradient window there). The `color` variant now sets the `trackColor` token on the root rather
  than the track's background, so the window's gradient takes the group's color too.
- **Tests:** `loading-indicator.spec.ts` ("leaves a gap on each side of the sliding linear
  indicator, on the web"), `new-components.spec.ts` (updated, snapshots);
  `progress-motion.e2e.test.ts` "leaves a gap on each side of the sliding linear indicator": at a
  paused frame the track's `slide` matches the indicator's and the window's stops sit 4px either
  side of the indicator's box. Visual suite: `progress`, `loading-and-wavy`, `search-and-feedback`,
  `color-groups` pass unchanged (no re-record).

### Storybook: `viewport.defaultViewport` removed in Storybook 10

- **Layer:** harness. Only Carousel set it (`stories.config.ts`).
- **Fix:** components' options take `globals` (plain data, the meta's), passed through the codegen
  (`generate-stories.ts`) and `composeStories` (merged with the scheme pin). Carousel now says
  `globals: { viewport: { value: "suites", isRotated: false } }` with the `suites` option still in
  `parameters.viewport.options`. The object form, not the string the warning suggests: the Vitest
  addon's `setViewport` reads `globals.viewport.value`, so the string would leave the story
  tests at the default 1200px.
- **Checked:** the Carousel story's `storyGlobals` carry the viewport and the canvas is 1280 wide
  in the manager (980 before, the old parameter being ignored); `Carousel.stories.ts` story
  tests pass in Solid and React.

### Hover highlight flickering on menu items and navigation bar items

- **Not reproduced**, in Solid or React, in the iframe or the full manager, on Menu Default (the
  user confirmed that story) and NavigationBar Default: 1px pointer sweeps across the items, the
  pointer resting with 1px jiggles for 2s, sampling every frame. Each item's background fades in
  and out once, monotonically, and nothing in the navigation bar's DOM changes while hovering.
- **Observed, possibly related:**
    - React: a menu item's hover comes from both CSS `:hover` and Zag's highlight
      (`states.hover`, rendered as `data-pf-hover`); the highlight follows the pointer about three
      frames (~50ms) after `:hover`, so for that time the old item stays lit while the new one
      starts fading in. Solid moves both in the same frame.
    - Opening the menu with the pointer on the button: for one frame the first item reports
      `:hover` (the content before it is positioned or grown), starting a hover fade that's undone
      the next frame.
- **Not changed:** no fix without a repro. Menus are 6b's section; see open questions.

### DockedDatePicker: React Native shows the format in the input, the web didn't

- **Cause:** the web bindings gave Zag `placeholder: " "` (the label resting over the input, the
  format in the supporting text). React Native (fix-storybook-5b) shows the format as the
  placeholder once focused.
- **Layer:** component: React and Solid `docked-date-picker.tsx`; preset `docked-date-picker.ts`.
- **Fix:** the bindings pass `dateFormatHint(locale)` as the placeholder ("mm/dd/yyyy",
  "dd/mm/yyyy" by locale). The preset styles the input's placeholder in the supporting color and
  makes it transparent while the input isn't focused, so it shows only once the label has floated
  (Material's hint), as React Native's does. The label still floats from `:placeholder-shown`.
- **Tests:** React and Solid `docked-date-picker.spec.tsx` (the input's placeholder is the
  format); preset `date-pickers.spec.ts` ("shows the format placeholder only once focused…",
  snapshot). Screenshots: Solid, React and React Native focused look alike; at rest only the label.

## Checks

- `omni run build test -p @pureform/preset -p @pureform/react -p @pureform/solid
  -p @pureform/rn-adapter -p @pureform/react-native`: React's `snackbar.spec.tsx` "closes itself
  after its duration" failed once (timing, untouched); `-f failed` passed.
- `bunx tsc --noEmit -p tsconfig.json`: clean in preset, react, solid, storybook-web,
  browser-e2e-tests.
- After `omni run generate prepare -p @pureform/panda-fixture`, browser suite:
  `progress-motion.e2e.test.ts` (12 passed), `direction.e2e.test.ts -t progress` (15 passed),
  `visual.e2e.test.tsx -t "(progress|loading-and-wavy|search-and-feedback|color-groups) looks"`
  (4 passed, nothing re-recorded).
- Component suites, `solid/css` and `react/tailwind`, server-rendering, accessibility, direction
  and themes `-t "DockedDatePicker|CircularProgress|LinearProgress"`: 378 passed.
- Story tests: CircularProgress, LinearProgress, DockedDatePicker, Carousel (Solid and React):
  102 passed. App unit tests: 16 passed. `omni run build -p @pureform/storybook-web` passes.

## Refactoring hints

- **Helpers that look generic:** `wavyRing`'s `half` (a shape drawn for half of the circle's box)
  would serve any two-half ring that needs a fixed pattern (a wavy track, if Material ever draws
  one). The track's "follow a sibling's animation through the same keyframes on a registered
  token" (`linearProgressTrackGap`) is a pattern for any part that must move in step with a
  sibling's WAAPI-free CSS animation.
- **Code that looks like a sibling's:** none new.
- **Suggested home:** stays in `shape-paths.ts` and `progress.ts`.
- **What must not change:** `progress-motion.e2e.test.ts`, the progress snapshots in
  `new-components.spec.ts`, the `progress` and `loading-and-wavy` screenshots.

## Open questions

- **Flat circular indeterminate track:** Compose's flat spinner draws no track; this keeps one on
  both shapes, as the finding asked. Say if the flat one should go back to none (a
  `shape: flat × indeterminate` choice, or a transparent `trackColor` while indeterminate).
- **React Native linear indeterminate:** keeps the whole track under the sliding bar (no gradient
  window there). It could split the track into two views around the indicator if wanted.
- **The gap's ends are square:** the window cuts the track's color straight, while Compose rounds
  the track's ends at each gap. Rounded ends need the track drawn in two parts (or a mask).
- **Menu hover flicker:** not reproduced headless. If it's the React desync above, the fix is to
  draw a pointer hover only from `:hover` and the keyboard highlight as focus (or to stop forwarding
  the highlight while the pointer is over the item); that changes menus on every web binding and
  belongs with 6b's menus, so it's left. A screen recording or the browser/OS (high refresh rate,
  trackpad) would help.
- The wavy linear README sentence about compounds per thickness was already stale; left as is.

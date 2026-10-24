# fix-storybook-7a: progress, motion and drawing

Branch `fix-storybook-7a` from main `1e2c1e01`, section "7a" of
[fix-storybook-7](../phases/fix-storybook-7.md). Not pushed; main untouched. Commits:
`git log --oneline main..fix-storybook-7a`.

| Commit     | What                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| `3ceee6b3` | Item 4: web drill motion on the theme's spatial spring                                |
| `751f01fa` | Item 1: progress track shown by default, `track={false}` hides it                     |
| `588ac96d` | Items 2, 3: indeterminate linear track in two rounded parts, React Native too         |
| `bd619ea2` | Item 9: Storybook toolbar picks React Native's motion engine                          |
| `e3220fa4` | Items 6, 7, 8: reanimated-svg keyframes, `alternate`, translucent cross-fade, ripples |
| `75a1176e` | Item 5: React Native drill: width, label FLIP, fades                                  |

## Items

### 1. The track shows by default; `track={false}` hides it (changed by the user)

The user replaced "the flat indeterminate spinner draws no track" with: the track is visible in
every case (linear and circular, flat and wavy, determinate and indeterminate, every renderer),
and a prop hides it. The phase file's item 1 now says so.

- **Done:** the preset already drew the track in every case (fix-storybook-6a kept it while
  indeterminate), so nothing changed there. The prop is `track?: boolean` (default `true`), named
  after the part it shows, as `caret`, `icon` and `leadingIcon` are elsewhere. It's in binding-core's
  new `ProgressReadyMadeProps`, taken by the ready-made `LinearProgress` and `CircularProgress` in
  React, Solid and React Native. `track={false}` leaves the `track` part out (with its halves and
  arcs on the circular one, its two parts on the linear one); the indicator and the stop dot stay.
  Composed, an app leaves out `Track`. It's a binding prop rather than a preset variant, so no
  variant group or compound was added. READMEs (React, Solid, React Native) say so.
- **Tests:** React and Solid `linear-progress.spec.tsx` ("draws the track by default, determinate
  and indeterminate, flat and wavy", "leaves the track out with track={false}", both components);
  React Native `progress.spec.tsx` (the same two).

### 2. Gap ends rounded as Compose's (track drawn in two parts)

- **Cause:** the indeterminate linear track was one bar whose color had a transparent window
  (a gradient) around the sliding indicator, so the gap's ends were cut square.
- **Done:** new slots `trackBefore` and `trackAfter`, children of `track` (anatomy regenerated).
  While indeterminate the track is transparent and only clips them (`overflow: hidden`, its own
  rounded ends); each part is as wide as the track, rounded (`radius("full")`), in `trackColor`,
  and starts where it would be with the indicator at the track's start (`trackBefore` at
  `calc(-100% - gap)`, `trackAfter` at `indeterminateWidth + gap`). Both run the new
  `linearProgressTrack` / `…Rtl` keyframes, a translate from `-1` to `2.5` indicator widths
  (`indeterminateWidth` in the keyframes, a token), on the indicator's duration and easing, so
  they move in step with it. Determinate: both `display: none`; the track is as before. The old
  gradient (`trackWithGap`) and the `linearProgressTrackGap` keyframes are gone. Every target.
- **Tests:** preset `loading-indicator.spec.ts` ("draws the indeterminate linear track in two
  rounded parts…", replacing the gradient test), `new-components.spec.ts` (updated; snapshot
  re-recorded: the two parts replace the gradient); browser `progress-motion.e2e.test.ts` "leaves a
  gap on each side of the sliding linear indicator, the track in two rounded parts" (ltr and rtl,
  Panda, CSS, Tailwind): at a paused frame each part ends 4px from the indicator, rounded, the
  track transparent and clipping. rn-adapter `factory.spec.ts` (the parts are moving slots).
  Visual suite `progress`, `loading-and-wavy`, `search-and-feedback`, `color-groups`: unchanged.

### 3. React Native linear indeterminate leaves the same gap

- **Done:** by item 2: the parts are plain views with keyframed translates, which React Native's
  keyframes run (percent translates, the token resolved), so React Native draws the same two
  rounded parts and gaps. The binding renders `trackBefore` and `trackAfter` in the track.
- **Tests:** React Native `progress.spec.tsx` "leaves a gap either side of the sliding indicator,
  drawn in two rounded parts moving with it" (mid-slide, each part 4px from the indicator, rounded;
  the track transparent and clipping) and "draws no parts while determinate".

### 4. Web drill motion reads the theme's spring

- **Done:** binding-core `menuDrillTiming(element, spring)` (exported from `/dom`): the spring the
  element inherits under the spring token's vars (`springFromVars`), sampled (`sampleSpring`) into
  a duration and a `linear()` easing; `MENU_DRILL_TIMING` (300 ms, emphasized) when the vars
  aren't set. React's and Solid's `DrillMotion` pass `springRoleVar(registry, "spatialDefault")`,
  as the sheets do, so the web drills on the same spring as React Native.
- **Tests:** `menu-drill-motion.spec.ts` "runs on the theme's spring when its vars are set, and on
  the fixed curve otherwise" (the content's animation takes the sampled duration and a `linear()`
  curve). React and Solid `menu.spec.tsx` drill tests and `overlays.e2e.test.ts -t Menu` pass.

### 5. React Native drill: width, label FLIP, fades

- **Done (`react-native/src/menu/menu.tsx`):**
    - `DrillSize` springs width and height (an `Animated.ValueXY`) from the last level's size to
      the new one's. While it moves, the rows sit in a view as wide as the window, aligned to the
      start, so they lay out at their own width, which it measures; at rest they're in the flow.
    - Only the label moves: the item passes its label's measurable to `onSelect` (a fourth
      argument), the drill notes the label's window position, and the row it moves into wraps just
      its label in `Flip` (the row stays in place).
    - The new level's other rows (and group labels) fade in (`FadeIn`, keyed by the step's level)
      on the same spring. Reduced motion: nothing moves.
- **Tests:** `components.spec.tsx` "springs a drilled menu's size to the new level, moves the
  pressed label into the header's, and fades the other rows in" (replaces the height-only test:
  mid-step the header row is in place and only its label near the pressed one, another row's
  opacity < 1, height and width part way; at rest the new size, wider). Fails without the change.

### 6. `reanimated-svg` runs keyframed shapes and `alternate`

- **Done:**
    - `ReanimatedSvgDrawing` runs `drawing.keyframes` as a Reanimated CSS animation of the path's
      `d` (frames by percentage, the curve per step, iterations, delay, direction), memoized on
      the frames and the box so a render doesn't restart it.
    - The Animated fallback of `SvgDrawing` (no CSS `d`, so devices) now runs through
      `runKeyframes` (`animate/keyframes.ts`'s loop, exported), which honours `reverse`,
      `alternate` and `alternate-reverse`, instead of running every direction but `reverse` as
      `normal`.
    - Shared in `geometry.ts`: `keyframeShapes` (frames padded with the base shape, each with its
      points and path; `undefined` for unmorphable shapes) and `cssDirection`.
- **Tests:** React Native `loading-indicator.spec.tsx` "morphs through the shapes with
  reanimated-svg too, and only turns under reduced motion" and "runs a keyframed shape's alternate
  direction with reanimated-svg"; `engines/svg.spec.tsx` "runs keyframed shapes in their direction
  where the browser can't animate `d`" (CSS `d` stubbed off: two normal iterations end on the last
  frame, two alternate ones on the first); rn-adapter `svg-motion.spec.ts` (keyframeShapes,
  cssDirection). Checked in Storybook: the loading indicator morphs on `reanimated-svg`.

### 7. Device SVG ripple clip

- **Not possible off the JavaScript thread with the Animated engine:** the native driver moves
  views, and a view can't sit inside the SVG's clip path; clipping a view to a path needs a mask
  view, which React Native doesn't ship and pureform doesn't depend on (no masked-view package in
  the repo). Documented instead: rn-adapter README, React Native README (new "Engines and drawn
  shapes" bullet), and `nativeSvgRipple`'s comment: the Animated SVG engine's device ripples clip
  to the surface's rounded corners; `reanimatedSvg` keeps the exact shape on the UI thread; the
  web clips exactly on both.
- **Tests:** none (documentation); existing ripple specs pass.

### 8. Translucent cross-fade keeps coverage

- **Done:** while the new fill fades in (opacity `t`), the old fill under it fades out with
  `fadeOutOpacity(alpha, t) = (1 − t) / (1 − alpha·t)` (`motion.ts`), `alpha` the new fill's
  opacity. That makes the pair cover exactly what the premultiplied blend of the two colors does
  (and the color too). An opaque new fill gives 1 throughout, so opaque fills behave exactly as
  before (no animation on the old path). On the web it's a 16-sample keyframe animation in the
  transition's progress with the transition's easing; on a device the Animated run writes it with
  the new path's opacity. `drawingSvg` takes `fadeOut` props for the under path.
- **Tests:** rn-adapter `svg-motion.spec.ts` (coverage equals the blend at several `t` and
  alphas; opaque keeps the old whole); React Native `engines/svg.spec.tsx` "fades a translucent old
  fill out as the new one fades in, keeping their coverage" (keyframes 1 → 0, ⅔ halfway for two
  half-transparent fills, the transition's duration; none for an opaque fill).

### 9. Storybook engine toolbar

- **Done:** `.storybook/preview.ts` has an **Engine** global (Animated + SVG, the default;
  Animated; Reanimated; Reanimated + SVG). `@pureform/react-native/storybook` exports
  `STORY_ENGINES` and `storyEngine(globals)`, and its provider decorator draws with it. The web
  renderers ignore it. The app README says so. Four items rather than three: "reanimated" alone
  has no shapes, so both Reanimated engines are there.
- **Tests:** `storybook/storybook.spec.ts` "follows the toolbar's engine…". Checked in
  `storybook dev`: `globals=renderer:native;engine:…` draws no SVG on `animated`/`reanimated` and
  morphs on `svg`/`reanimated-svg`.

## Checks

- `omni run build test -p @pureform/anatomy -p @pureform/preset -p @pureform/binding-core
-p @pureform/react -p @pureform/solid -p @pureform/rn-adapter -p @pureform/react-native`: one
  failure, React Native `a11y-roles.spec.tsx` "with reanimated › the select › takes the web's
  select's keys", which also failed in 3 of 3 runs with this branch's menu reverted to main's (and
  passes in some runs either way), so it isn't this batch's; `-f failed` then passed everything.
  A first run had React's `menu.spec.tsx` "animates a drill step" fail once under load (passes
  alone and in the later runs).
- `bunx tsc --noEmit -p tsconfig.json`: clean in preset, binding-core, react, solid, rn-adapter,
  react-native, anatomy, storybook-web, browser-e2e-tests.
- `omni run build -p @pureform/storybook-web`: passes.
- After `omni run generate prepare -p @pureform/panda-fixture`: browser `progress-motion.e2e.test.ts`
  (15 passed); `direction`, `rn-parity`, `visual` `-t "rogress|loading-and-wavy"` (17 passed);
  visual `(progress|loading-and-wavy|search-and-feedback|color-groups) looks` (4 passed, nothing
  re-recorded). Component suites `server-rendering`, `accessibility`, `direction`, `themes` on
  `solid/css` and `react/tailwind` `-t "LinearProgress|CircularProgress"` (270 passed);
  `overlays.e2e.test.ts` on `solid/css` and `react/panda` `-t Menu` (34 passed).
- Story tests: Menu, LinearProgress, CircularProgress, LoadingIndicator on `storybook/solid`,
  `storybook/react`, `storybook/native` (150 passed).
- No conflict markers.

## Refactoring hints

- **Helpers that look generic:** `menuDrillTiming` (binding-core) is "a spring role's vars as a
  WAAPI timing"; any web motion run through `element.animate` that should match React Native's
  spring could use it (generalize to `springTiming(element, var, fallback)` next to
  `springFromVars` in `settle.ts`). `fadeOutOpacity` (rn-adapter `motion.ts`) is the exact
  constant-coverage cross-fade for any two stacked layers. `keyframeShapes`/`cssDirection`
  (`geometry.ts`) serve both SVG engines. React Native's `FadeIn` and `Flip` in `menu.tsx` are
  generic.
- **Code that looks like a sibling's:** `DrillSize` now overlaps `Expanding` (`expand.tsx`) even
  more (two axes); `useSpatialSpring`/`springing` still repeat `Expanding`'s spring setup (the 6b
  hint stands). The linear track parts' "move with a sibling through the same timing" replaces
  6a's registered-token pattern for this case.
- **Suggested home:** `useSpatialSpring`, `FadeIn` and `Flip` in `react-native/src/presence.ts`
  or a `motion.tsx`; `springTiming` in `binding-core/src/settle.ts`.
- **What must not change:** `progress-motion.e2e.test.ts`, the progress snapshots in
  `new-components.spec.ts`, `progress.spec.tsx` (React Native), `svg.spec.tsx`,
  `svg-motion.spec.ts`, `loading-indicator.spec.tsx`, the three bindings' menu specs and
  `menu-drill-motion.spec.ts`.

## Open questions

- **Circular gap ends:** the circular arcs and track are drawn with ring borders, so their ends
  (and the gaps') stay square; Compose rounds them (round stroke caps). Rounding them needs
  another drawing (caps as dots at each arc end, or SVG/`shape()` arcs). Not in this item's scope
  (the open question it came from was the linear window); say if wanted.
- **`track={false}`** keeps the stop dot (Compose draws it with the track; an app wanting neither
  can also hide `stopIndicator` with `unstyled`/`slotProps`). Say if the dot should go with it.
- **React Native drill width:** while moving, rows lay out at their own width; if the menu's
  minimum width is larger than the new level's, the spring aims at the narrower width and the
  surface's minimum holds it, so the rows widen to the surface at rest (invisible: rows have no
  background at rest).
- **Linear track parts:** each part is the track's width and runs from outside the track, clipped
  by it; with a custom `indeterminateWidth` in pixels the keyframes still move them as far as the
  indicator (the token is in the keyframes). On React Native an instance's own
  `indeterminateWidth` override may not reach the keyframes (not checked; the theme's value does).
- **Engine toolbar** shows on every renderer (Storybook's globals can't hide per renderer); the
  web ignores it.

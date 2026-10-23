# fix-motion: Motion and shape fixes from Storybook reports (output context)

Commits: see `git log 40365fe..fix-motion`. Five issues the user saw in Storybook
(`apps/storybook-web`, stories from `@pureform/component-cases`). Each was in the component, not
the story.

## Per issue

### 1. Accordion, Tree, Stepper, ListItem: no size animation on expand and collapse

- **Cause:** the component. Zag shows and hides the part with `hidden` (accordion content, tree
  group, list item region, stepper content). The preset gave the part no transition, and no
  binding animated its size, so it jumped. React Native mounts the part only while it shows, so
  the layout jumped there too.
- **Fix:**
    - Preset: `collapseTransition` (`packages/preset/src/components/shared.ts`) is
      `springTweens("spatialDefault", ["height"])`. It's on `accordion.content`, `tree.group`,
      `listItem.region` and the vertical `stepper.content`. A horizontal stepper swaps its
      content in place, so it doesn't get it. Under reduced motion the transition is `none`.
    - Web: `watchCollapse(element)` (`packages/binding-core/src/collapse.ts`, exported from
      `@pureform/binding-core/dom`) watches the part's `hidden` attribute. On each change it runs
      the height and the block padding from shut (0) to the content height, or back, with
      `Element.animate`. It uses the timing the part's own `height` transition gives: the
      spring's duration and `linear()` curve. A shrinking part stays shown
      (`display: block !important`, which beats the `[hidden]` reset) until it reaches 0, then
      hides. A change mid-flight starts from the height on screen. With no transition (reduced
      motion, unstyled) it does nothing. It only reads and sets the part's own size, never a
      scroll position.
    - React and Solid attach it with a `collapsible` ref (`packages/{react,solid}/src/motion.ts`)
      on Accordion `Content`, Tree `Group`, ListItem `Region` and Stepper `Content`.
    - React Native: `useExpandMotion()` (`packages/react-native/src/expand.ts`) calls
      `LayoutAnimation.configureNext` before each toggle in Accordion, Tree, ListItem and the
      vertical Stepper. Its duration is the settle time of the theme's `spatialDefault` spring
      (`themeSpring`, `settleTime`), and it uses the spring's damping ratio. It doesn't run
      under reduced motion.
- **Spec source:** Material has no accordion. Compose expands and shrinks with
  `AnimatedVisibility` (`expandVertically`/`shrinkVertically`, a size spring), and M3
  Expressive's motion scheme moves size on `DefaultSpatial`
  (`MotionScheme.defaultSpatialSpec`).
- **Tests:** `tests/component-suites/src/expand-motion.e2e.test.ts`. It covers accordion open
  and close on the spring's `linear()` curve, the part staying shown while it shrinks and then
  hiding, the scroll position staying put, nothing running under reduced motion, and a tree
  branch opening. Passes on solid/panda, react/css and react/tailwind. Preset specs:
  `expandable.spec.ts`. rn-adapter `factory.spec.ts` now counts the list item's `region` as a
  moving slot.

### 2. Accordion: only the header ripples. Is that expected?

- **Expected, not changed.** The header is the item's only interactive element: it's the
  `button` with `aria-expanded`, and it's the indication's trigger and surface. The content is
  static text with no action, so it gets no state layer.
- **Spec source:** Angular Material's `mat-expansion-panel-header` takes the hover, focus and
  press state, and `mat-expansion-panel-content` doesn't. Compose's expandable list rows work
  the same way: only the clickable row has `indication`. Material 3's state-layer guidance puts
  a state layer only on interactive surfaces. If a whole tile should react, it needs its own
  trigger (see the open questions).

### 3. Button corners snap on press and hold

- **Cause:** the component. The round radius was the theme's `radius("full")`, which is
  `9999px`. The browser clamps the drawn radius to half the height, so a spring from 9999px to
  8px spends almost all its time above the clamp. Nothing moves on screen until the very end,
  then the corner snaps. This is worse at small sizes, where the clamp is lower.
- **Fix:** `pillRadius(height)` (`shared.ts`) is `min(radius("full"), height × 0.5)`. Each
  button and icon button size sets its `radius` token from it, using the size's height with
  the density offset. The morph now runs over the radii that actually show, and a theme with
  `full: 0` still gets square corners. Also, `cornerRadius` now checks `pressed` before
  `selected`, as Compose's `shapeByInteraction` does. CSS specificity already made pressed
  win, so nothing visible changes from that.
- **Spec source:** Compose's `ButtonDefaults.shapes()` and `ToggleButton`'s
  `shapeByInteraction` animate `RoundedCornerShape` corners as sizes of the shape
  (`rememberAnimatedShape`), on the `effectsDefault` spring. They don't use a huge length.
- **Tests:** `button.spec.ts` ("rounds fully at half its height"). Button and icon button
  snapshots. rn-adapter `geometry.spec.ts` now expects 20px instead of 9999. The visual test
  for the connected group expects 20px.

### 4. Button group corners wrong, especially with the first or last item selected

- **Cause:** the component. In a connected group, `groupCorners` gave the run's outer corners
  the button's own morph (`cornerRadius`). So a selected toggle turned its outer corners
  square (`squareRadius`) while its inner corners went round, and pressing an outer corner
  shrank it to `pressedRadius`. Selecting the first or last item looked inside out.
- **Fix:** `groupCorners` (`packages/preset/src/components/button-group.ts`):
    - The outer corners keep the resting corner (full by default, or square for a square
      group) while pressed.
    - The inner corners take `innerRadius`, and `pressedInnerRadius` while pressed.
    - A selected toggle goes fully round on every corner.
    - Pressed wins over selected.
- **Spec source:**
    - MDC-Android `docs/components/ButtonGroup.md`: a connected group has "2dp spacing, 8dp
      inner corners, and fully rounded outer corners".
    - Compose `ButtonGroupDefaults`: `connectedLeadingButtonShape` /
      `connectedLeadingButtonPressShape` keep `ShapeDefaults.CornerFull` outside and change
      only the inner `InnerCornerCornerSize` → `PressedInnerCornerCornerSize`;
      `connectedButtonCheckedShape = ShapeTokens.CornerFull`.
    - Compose `ToggleButton.kt` `shapeByInteraction`: pressed, then checked, then rest.
- The standard group's press growth (+12px, Compose about 15%) and its spatialFast spring are
  unchanged.
- **Tests:** `button-group.spec.ts` ("keeps a connected run's outside corners while pressed and
  rounds a selected button fully"). The visual check now also covers the pressed outside and
  inside corners. New cases: `connected, first selected` and `connected, last selected` in
  `packages/component-cases/src/cases/button-group.ts`, which become Storybook stories.

### 5. Indeterminate wavy (and flat) progress too fast

- **Cause:** the component. The linear slide used `extraLong4` (1000ms) per cycle, and the
  circular spin used `long2` (500ms) per turn. The wave clip moves with the bar or ring, so
  the wave raced too.
- **Fix:** new tokens set these durations, so themes can retune them:
    - `linearProgress.indeterminateDuration` is 1750ms.
    - `circularProgress.rotationDuration` is 1500ms per turn.
- **Spec source:** Compose `ProgressIndicator.kt`:
    - `LinearAnimationDuration = 1750`.
    - Circular: `CircularAnimationProgressDuration = 6000`, with
      `CircularGlobalRotationDegreesTarget = 1080f` plus
      `CircularAdditionalRotationDegreesTarget = 360f` per cycle. That's 1440° in 6000ms, so
      1500ms a turn on average.
    - The wavy indicators use the same specs, and `waveSpeed` defaults to one wavelength per
      second (`WavyProgressIndicator.kt`).
- **Tests:** `new-components.spec.ts` ("runs indeterminate at Compose's pace"). Progress
  snapshots.

## Checks run

- `omni run build test` on preset, binding-core, component-cases, react, solid and
  react-native, rerun with `-f failed`. Two failures remained, and both look like load flakes
  unrelated to this change:
    - rn-adapter `factory.spec.ts` "gives what selection gives…" timed out at 60s.
    - react-native `presence.spec.tsx` "staggers the FAB menu's items" passes when run alone.
- Component-suites e2e:
    - `expand-motion` passes on solid/panda, react/css and react/tailwind.
    - `controllable`, `keyboard` and `indication` pass for these components (react/css, and
      solid/panda for `controllable` and `keyboard`).
- Browser visual suite: the buttons, icon-buttons, button-groups, disabled-buttons,
  expandables, steppers, lists, nested-rows and progress sections pass with no screenshot
  re-recorded. The connected-group check was updated for the intended 20px corners.
  `rn-motion` and `rn-parity` pass when narrowed to these components.
- `bunx tsc --noEmit -p tsconfig.json` is clean in preset, binding-core, react, solid,
  react-native and component-cases.
- `omni run build -p @pureform/storybook-web` passes.

## Refactoring hints

- **Helpers that look generic:**
    - `watchCollapse` / `transitionTiming` (`packages/binding-core/src/collapse.ts`) can serve
      any part that shows and hides with `hidden` and should grow open, such as a menu
      submenu, an expandable card or the navigation drawer's sections.
    - `pillRadius` (`shared.ts`) should replace `radius("full")` wherever a full corner morphs:
      chips (`spatialCornerTransition`), FAB, the FAB menu's toggle, and the split button.
    - `useExpandMotion` (React Native) can serve any mount or unmount that changes layout.
- **Code that looks like a sibling's:** `transitionTiming` splits a `linear()` list the same
  way `settle.ts`'s `splitList` does. Share one splitter.
- **Suggested home:** `collapse.ts` and `settle.ts` could share a `computed-timing.ts` in
  binding-core.
- **What must not change:** the `expand-motion` e2e, the button and button-group specs and
  snapshots, the visual sections listed above, and the progress spec.

## Open questions

- **Chips, FAB and split button** still morph from `radius("full")`, so their corners still
  snap. Applying `pillRadius` there would need their heights, which isn't hard, but it's
  outside this batch.
- **Linear wavy wave anchoring:** Compose moves the wave along the track at one wavelength per
  second, apart from the line's head and tail. Here the wave clip rides with the sliding bar.
  The slower cycle helps, but the wave still moves with the bar.
- **Indeterminate shape:** the circular indicator spins at a constant speed with a fixed
  quarter arc. Compose also grows and shrinks the arc (10%–87%) and adds stepped rotations.
  Only the average speed matches now.
- **React Native on the web** (`rn-web-demo`): `LayoutAnimation` is a no-op in
  react-native-web, so expand and collapse still jump there. It runs on devices.
- **Accordion tile ripple:** if the user wants the whole tile to react (issue 2), that would be
  a new opt-in (for example, a content trigger), not a change to the default.

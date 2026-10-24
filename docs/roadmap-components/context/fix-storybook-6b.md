# fix-storybook-6b: React Native and menus

Branch `fix-storybook-6b` from main `a835d9ad`, the "6b" items of
[fix-storybook-6](../phases/fix-storybook-6.md). Not pushed. Each item was reproduced first in
`storybook dev -p 6471` with Playwright (screenshots, clicks, computed styles and running
animations read mid-motion), React Native beside React or Solid. Shots under
`/tmp/opencode/fix-storybook-6b/`.

## Items

### React Native submenus don't transition in like the first menu

- **Cause (component):** React Native's cascaded submenu was a bare `Surface` (`open={undefined}`)
  in the portal: no presence, so it appeared and went at once; the first menu runs the popup
  presence in an engine view with the anchored transform origin.
- **Layer:** component (`react-native/src/menu/menu.tsx`).
- **Fix:** the cascade runs `useOverlayPresence(beside !== undefined, "popup")` in an
  `engine.View` with `placed.transformOrigin`, as `MenuOverlay` does. The last submenu shown is kept
  (a ref) while it fades out, taking no presses (`pointerEvents: "none"`).
- **Tests:** `components.spec.tsx` "grows a cascaded submenu in as the menu does, and fades it out"
  (full motion, `timeScale` 10; fails without the fix).

### React Native shaped Media isn't shaped; LoadingIndicator doesn't animate

- **Cause (harness, then adapter):** the Storybook provider (`@pureform/react-native/storybook`)
  used the default `animated` engine, which has no SVG, so no shapes: Media drew a rounded box and
  the indicator a turning circle (it did turn; a turning circle looks still). With SVG on, the
  indicator still didn't morph: React Native's keyframes dropped `clipPath`, and the drawing had
  no way to run keyframed shapes. And React Native eased a multi-frame keyframe animation over the
  whole cycle, where CSS eases each step between frames (Compose's indicator pulses each
  shape-to-shape step).
- **Layers:** harness (Storybook provider) and component/adapter (rn-adapter).
- **Fix:**
    - `react-native/src/storybook/index.ts`: the provider draws with `animatedSvg`
      (react-native-svg runs on React Native Web). The storybook entry now imports
      react-native-svg, an optional peer of the package.
    - rn-adapter `lower.ts`: a keyframe's `clipPath` lowers to the shape key; `motion.ts`
      `channels` skips it (not a style).
    - rn-adapter `select.ts`: with `svg`, a slot whose animation has shapes gets
      `drawing.keyframes` (`ShapeKeyframes`: the timing and each frame's shape).
    - rn-adapter `svg.ts`: `useShapeKeyframes` in `SvgDrawing` morphs the paths through them:
      the browser's `d` animation where CSS animates it (per-frame easing), elsewhere an Animated
      loop writing `d` (native props on a device, the attribute on the web), easing each step.
    - rn-adapter `animate/keyframes.ts`: the loop runs linearly and each channel's
      `interpolate` takes the curve (`easing`), so the curve eases each step between frames, as
      CSS. Two-frame animations are unchanged.
    - Reduced motion selects the spin animation (no shapes), so it only turns, as the web.
- **Tests:** rn-adapter `geometry.spec.ts` "the loading indicator's keyframed shapes" (8 frames,
  7 distinct shapes of one structure, none without SVG or under reduced motion); React Native
  `loading-indicator.spec.tsx` "morphs through Material's shapes with an SVG engine…" (an infinite
  8-frame `d` animation; none under reduced motion). Storybook Media and LoadingIndicator story
  tests pass on native (`SB_RENDERERS=native`), Solid and React.

### Drilled submenus: animate the size, FLIP the pressed item into the header

- **Not done before on any renderer** (levels swapped at once).
- **Layer:** component.
- **Web (React, Solid):** `binding-core/src/menu-drill-motion.ts` (exported from `/dom`):
  `menuDrillFrom(content, from, to)` notes the content's size and the moving row's label box before
  the level changes; `menuDrillTo(content, snapshot)` then animates the content's `width`/`height`
  from the old size (clipped meanwhile), moves the label (FLIP translate) into its row in the new
  level, and fades the level's other rows and groups in. In: the pressed item's label into the
  back row's; out: the back row's label into the submenu's item. 300 ms on
  `cubic-bezier(0.2, 0, 0, 1)` (`MENU_DRILL_TIMING`); nothing under `prefers-reduced-motion`. The
  ready-made menus note the step in `onSelect` and run it from a `DrillMotion` child of `Content`
  once the level is drawn (React `useLayoutEffect`, Solid `createEffect`).
- **React Native:** `DrillSize` springs the rows' height from the last level's to the new one's on
  the theme's `spatialDefault` spring (clipped meanwhile, no height at rest), and `Flip` wraps the
  row a step moves into: it starts where the moving row was (window coordinates, measured at the
  press) and springs into place, hidden until measured. Menus with `submenu="cascade"` and the
  search view's bare items aren't wrapped. Reduced motion: nothing moves.
- **Tests:** binding-core `menu-drill-motion.spec.ts` (size, label translate, fades; none under
  reduced motion); React and Solid `menu.spec.tsx` "animates a drill step…" (content, header label
  in, item label out); React Native `components.spec.tsx` "springs a drilled menu's height…"
  (fails without the fix). Checked mid-motion in Storybook on all three renderers.

### TouchTarget on React Native

- **Missing:** no React Native TouchTarget (the story said "isn't implemented").
- **Layer:** component, and the story's stage.
- **Fix:** `@pureform/react-native/touch-target`: `TouchTarget`, a layer over its parent
  (`pointerEvents="box-none"`) centring a view at the parent's size and at least the theme's minimum
  (read from the preset's `touchTarget` style's `minWidth`), `aria-hidden`. Centred by flex rather
  than the web's percentage translate. A press on it presses the pressable (its child).
  `useTouchTargetSlop(width, height)` gives the same area as a `hitSlop`, for Android, where a
  child's touches outside its parent count only where nothing clips them. README entry.
- **Stage:** `src/stages/touch-target.ts`'s dot is a flex box, so React Native's app root fills it
  (a block parent gave it no height).
- **Tests:** `touch-target/touch-target.spec.tsx` (48×48 centred on an 18px pressable, a press
  outside the dot presses, the slop); TouchTarget story tests on native (`SB_RENDERERS=native`),
  Solid and React.

### React Native FileUpload has no button

- **Cause (harness):** by design React Native's trigger shows only given `onPick` (the app picks
  files); the story passed none.
- **Layer:** harness, plus a component a11y fix found on the way.
- **Fix:** a React Native scene (`src/native/scenes.ts` `FileUpload`, listed in
  `stories.config.ts`'s native `scenes`): the story is the app, its picker adds a sample file
  (`pickedFile` in `src/renderers/scenes.ts`) and the remove buttons take one out. Adding a file
  showed list items outside a list (axe `aria-required-parent`): the item group is `role="list"`.
- **Tests:** `src/stages/file-upload.ts` (new hook): every renderer draws "Choose files"; on React
  Native pressing it adds a row. React Native `components.spec.tsx` checks the list role.

### React Native DateInput placeholders

- **Cause (component):** the segments' placeholders were drawn in `onSurfaceVariant`, so the focused
  empty segment's `mm` was grey on the focus color (unreadable) and the resting ones lighter than
  the web's (which draws them in the segment's own color).
- **Fix:** `placeholderTextColor` is the segment's selected color for its state.
- **Tests:** `date-pickers.spec.tsx` "draws its placeholders in the segment's color…" (fails
  without the fix).

## Checks

- `omni run build test -p @pureform/binding-core -p @pureform/rn-adapter -p @pureform/react
-p @pureform/solid -p @pureform/react-native`: React Native's `presence.spec.tsx` FAB stagger
  (reanimated) failed once (the timing flake 5b noted); `-f failed` passed.
- `bunx tsc --noEmit -p tsconfig.json`: clean in binding-core, rn-adapter, react, solid,
  react-native, component-cases and storybook-web.
- `omni run build -p @pureform/storybook-web`: passes; app unit tests 16 passed.
- e2e after `omni run generate prepare -p @pureform/panda-fixture`: `overlays.e2e.test.ts` on
  `solid/css` and `react/panda` `-t Menu`: 34 passed. Browser suite `rn-motion`, `progress-motion`,
  `rn-parity`, `reduced-motion` `-t "oading|rogress|enu|eyframe"`: 27 passed.
- Story tests: Menu, LoadingIndicator, Media, DateInput, FileUpload, TouchTarget on
  `storybook/solid` and `storybook/react`; FileUpload, TouchTarget, Media, LoadingIndicator base
  stories on `storybook/native`.
- Visual suite not rerun: the drill motion only shows mid-step, and no resting web style changed.

## Refactoring hints

- **Helpers that look generic:** `menuDrillFrom`/`menuDrillTo` are a size tween plus a FLIP of one
  element between two DOM states; tabs' or a list's reorder could use the same. React Native's
  `DrillSize` is `Expanding` (`expand.tsx`) for a height change rather than open/shut, and
  `Flip` a generic window-coordinate FLIP; `useSpatialSpring` and `springing` repeat `Expanding`'s
  spring setup.
- **Code that looks like a sibling's:** the cascade's presence repeats `MenuOverlay`'s presence
  view (engine view, transform origin, `pointerEvents` while closing). React's and Solid's
  `DrillMotion` are the same steps.
- **Suggested home:** a React Native `useSpatialSpring` next to `themeSpring` in `presence.ts`;
  `Expanding` could take a `measureKey` to cover `DrillSize`.
- **What must not change:** the three bindings' menu specs, `menu-drill-motion.spec.ts`,
  `geometry.spec.ts`, `loading-indicator.spec.tsx`, `progress-motion.e2e.test.ts`.

## Open questions

- **Drill timing on the web** is fixed (300 ms, emphasized-ish curve), not read from the theme's
  motion tokens; React Native uses the theme's `spatialDefault` spring. Say if the web should read
  the spring's CSS variables (`springFromVars`).
- **React Native drill** animates height only (the menu's width follows its widest row at once),
  moves the whole row rather than just its label, and doesn't fade the other rows.
- **Keyframed shapes on `reanimated-svg`:** `ReanimatedSvgDrawing` doesn't run
  `drawing.keyframes` yet, so the indicator only turns there. `alternate` directions run as
  `normal` in the Animated fallback (the browser path honours them).
- **Per-step keyframe easing** changes every React Native keyframe animation with more than two
  frames to CSS's semantics (the loading indicator's turn now pulses per shape, as Compose's).
- **Storybook's React Native engine** is fixed to `animatedSvg`; a toolbar to pick the engine
  (animated, svg, reanimated) would show each.
- **TouchTarget on Android** relies on the parent not clipping; `useTouchTargetSlop` is the
  dependable route there. No React Native component draws its own `touchTarget` slot with it yet.
- React Native date segments' separators sit tighter than the web's (`mm/dd/yyyy` vs
  `mm / dd / yyyy`); not in this batch.

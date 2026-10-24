# fix-components-2

User-reported Storybook issues (`apps/storybook-web`), fixed on branch `fix-components-2` from
main at `4a948474`. Each was reproduced in the dev Storybook with Playwright (probes under
`/tmp/opencode/fix-components-2-*.mjs`) before and after the fix.

## 1. Switch: a disabled thumb still morphed

- **Cause:** the component (preset). The handle grows to `handleSizePressed` on
  `slot("root", "pressed")`, which on the web is `:active` on the root, a `<label>`. A label still
  matches `:active` while its input is disabled, so pressing a disabled switch grew the thumb
  (16→28px; 24→28px when on). Hover was fine: the disabled colours already outrank hover. React
  Native was fine too (a disabled `Pressable` never presses).
- **Fix:** `packages/preset/src/components/switch.ts` builds the handle's size with
  `handleSize()`, which adds `[pressed, disabled]` (and `[checked, pressed, disabled]`) cases back
  to the resting sizes, for `icons: both` too.
- **Source:** an Android view that is disabled never enters the pressed state, so MDC-Android's
  `MaterialSwitch` thumb (`mtrl_switch_thumb` state list) never grows; M3 switch specs show the
  disabled handle at its resting size.
- **Tests:** `controls.spec.ts` ("doesn't grow the handle on a press while disabled") and the
  recipe snapshot; Storybook play `src/checks/switch.ts` on Disabled / Disabled And On (web
  renderers; RN's disabled switch takes no pointer).

## 2. SplitButton (React): the menu opened late

- **Cause:** the Storybook app. The split button's case has a key that clicks, so `compose.ts`
  gave every story an `onClick: fn(...)` spy, which the root `<div>` hears as the trailing
  button's click bubbles. Storybook's actions logger serializes what a spy is called with; for a
  React synthetic event that walks the fiber tree through its target, a 140–290ms long task per
  click (CPU profile: `emit` → `stringify` in `storybook_internal_preview_runtime`). The menu's
  open state landed 200–400ms after the click; Solid's native event serialized fast (~15ms). The
  React menu and split button themselves open in the same frame as Solid's.
- **Fix:** `clickHandler()` in `src/renderers/compose.ts`: the arg calls `preventDefault` and a
  named spy with `{ type }` only; `keyPlay` reads the spy from `args.onClick.spy`. Measured after:
  React 25–85ms to first visible frame, Solid 25–45ms.
- **Tests:** the generated key plays (Enter/Space "click") still pass through the spy.

## 3. Media: whole screen on the web, nothing on React Native

- **Cause (web):** the story. Media fills its container's width by design (M3 media sits in a
  card); the canvas is the whole width, so a portrait picture ran far past the screen.
- **Cause (RN):** the component. React Native's `Media` took only `source={{ uri }}`, not `src`
  as the web's and RN's own `Avatar` do, so the case's `src` left it with no source (it threw on
  `props.source.uri`). And at `aspect: auto` an RN `Image` has no intrinsic size, so it drew 0px
  tall where the web `<img>` takes the picture's proportions.
- **Fix:** `src/stages/media.ts` puts its stories in a 320px frame (`frame()` in `stage.ts`).
  `packages/react-native/src/single-part.tsx`: `Media` takes `src` (and still `source`); at `auto`
  it reads the picture's size with `Image.getSize` and takes its ratio. SVG data URIs work on
  React Native Web; native `Image` can't draw SVG, which is the app's concern.
- **Tests:** RN `components.spec.tsx` "media"; Storybook play (320×240 for the 40×30 picture on
  all three renderers).

## 4. Splitter

- **"Previous size not found for panel index 1" (Solid; React too):** the component, through the
  case. Zag only measures a root with length; the vertical example has no height, so `size`
  stayed `[]` and a key or drag on the divider reached `resizeByDelta`, which throws. Fixed in
  `packages/machines/src/splitter/index.ts` (the c8 wrapper): the resize actions
  (`setKeyboardValue`, `setPointerValue`, `resizePanel`, `collapse*`/`expand*`) measure first and
  do nothing while there are still no sizes. Shared by Solid and React. Test: Solid
  `splitter.spec.tsx` "stacked, …" (failed with exactly this error before).
- **"Unexpected text node: Detail" (RN):** the component: the case's string `content` went
  straight into a `View`. RN's splitter now draws a string or number pane in the panel's `Text`,
  with `onSurface` (nothing inherits on RN; axe flagged its contrast in dark).
- **Vertical resizing:** the story, plus RN parity. A stacked splitter divides its parent's
  height, and the canvas gave none (panes 0px). `src/stages/splitter.ts` draws the stories in a
  240px-high frame; Zag sizes the web root 100%×100%, and RN's root now `flexGrow: 1`s to match.
  Orientation checked in all bindings: Solid/React pass `orientation` to Zag and the variant;
  RN uses `dy` and the column layout. Storybook play on Default and Vertical (ArrowDown grows the
  first pane) on all three renderers.
- **Source:** Compose's `VerticalDragHandle`/pane expansion resizes within the bounded scaffold;
  Zag `splitter` requires a measured root.

## 5. React Native BottomSheet "Opened Standard": no button

- **Cause:** the component. With `modal={false}` RN rendered only the surface (its doc said
  "showing it is the app's"), dropping the trigger and `defaultOpen`, and RN took `children` but
  not the web's ready-made `body`, so the text was missing too.
- **Fix:** `bottom-sheet.tsx`: a standard sheet given a `trigger` or `defaultOpen`
  (`StandardBottomSheet`) keeps its own open state, draws the trigger, and the surface in place
  after it (enter/exit, drag handle closes it); `body` is the content when `children` isn't.
  Without them the surface alone is unchanged.
- **Source:** M3 standard bottom sheets coexist with the main UI (no scrim); Compose's
  `BottomSheetScaffold`. Placement remains the app's layout on RN.
- **Test:** RN `components.spec.tsx` "standard bottom sheet".

## 6. React Native Badge stretched (except Small)

- **Cause:** RN has no inline flow. The web badge is `inline-flex` and hugs its content in a
  block parent; an RN view is a flex column child and stretches across it unless it has a width
  (Small has `width: 6`, hence the exception). In Storybook the RN tree was also mounted straight
  into a block `<div>`, which stretches any flex box regardless of `alignSelf`.
- **Fix:** preset `badge.ts`: in flow, `alignSelf: platform({ css: literal("auto") }, start)`, so
  React Native takes `flex-start` and the web keeps its parent's alignment (a first attempt with
  `start` everywhere moved the visual suite's centred badges row to the top, so it's RN only).
  `StyleMap` gained `alignSelf` (`packages/core/src/ast/style.ts`; the adapters already lowered
  it). `@pureform/react-native/storybook` wraps stories in a `flexGrow: 1` `View`, as an app's
  root, so RN stories lay out as on a device.
- **Overlap with fix-layout:** that branch's `49d3c96f` sets `alignSelf: "flex-start"` in the RN
  `BadgeImpl` only when the style has no `alignSelf`; with this preset value it becomes a no-op
  (same behaviour), so both merge cleanly in either order (different files; `components.spec.tsx`
  gets two badge specs, both appended). The fix-layout binding patch can be dropped after merging.
- **Tests:** preset `badge.spec.ts` + snapshot; RN `components.spec.tsx` "badge in flow";
  Storybook play `src/checks/badge.ts` (Default and Long Count, all three renderers).

## Checks run

- `omni run build test -p @pureform/core -p @pureform/preset -p @pureform/machines -p
@pureform/solid -p @pureform/react-native`: all pass but known flakes under load: Solid
  `fade-through.spec.tsx` "drops the old page at once … (unstyled)" fails on the
  fix-storybook-2 worktree too (pre-existing); RN date-pickers/snackbar/toaster/FAB stagger and
  c8c drag tests timed out under load and pass when rerun alone.
- e2e (`tests/component-suites`, solid/panda, react/css, react/tailwind): keyboard `-t Splitter`,
  indication `-t Switch`, themes `-t Badge`, controllable `-t Splitter`, direction
  `-t "Splitter|Badge|Switch"`: all pass.
- Visual suite `-t "badges|controls"`: passes, nothing re-recorded.
- Story tests (with `SB_RENDERERS=solid,react,native`) for Splitter, Media, SplitButton, Switch,
  Badge, BottomSheet, List, Button: pass, except RN BottomSheet "Opened Plain"/"Opened Partly
  Open" (`aria-allowed-attr` on the modal's `aria-modal` view; RN story tests are off by
  default, untouched here).
- `tsc --noEmit` clean in core, preset, machines, solid, react-native.
  `apps/storybook-web` reports 275 errors, all inside `packages/solid/dist/*.jsx` that its
  program pulls in; none in its sources.
- `omni run build -p @pureform/storybook-web` passes.

## Refactoring hints

- **Helpers that look generic:** `frame()` in `apps/storybook-web/src/stages/stage.ts` (a sized
  frame the story fills) suits any fill-parent component (carousel, side sheet). RN's
  "string child → `Text` with `onSurface`" now exists in card, accordion, bottom sheet, splitter;
  a `TextOrNode` helper in `packages/react-native/src/icon-style.tsx` would serve all.
- **Suggested home:** that helper beside `ownText`.
- **What must not change:** the badge/switch recipe snapshots and the visual `badges`/`controls`
  screenshots.

## Open questions

- RN badge in a row whose `alignItems` is `center` now sits at the top (`flex-start` overrides
  the parent), as fix-layout's patch already did. Compose's `Row` aligns to the top by default,
  so this matches Compose, but an app that centres a row must wrap or style the badge.
- Should RN's other `inline-flex` roots (checkbox, switch, chips) get the same treatment? Not
  reported, and riskier across RN fixtures; left alone.
- The click spy logs `{ type }` only; if the actions panel should show more, add fields
  explicitly rather than passing the event.
- `Media` on RN keeps `source` alongside `src`; deprecate `source` later if wanted.

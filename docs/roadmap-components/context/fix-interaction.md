# fix-interaction: interaction issues seen in Storybook (output context)

Commits: 39b73b21..HEAD on `fix-interaction` (from `main` at 40365fe1; not pushed)

## Built

Fixes for six issues the user reported in Storybook (`apps/storybook-web`). Each section gives
the cause, where the fix went (story or component), and the spec source.

### 1. React Native List is non-interactive by default

- **Cause: the component.** The case's default `List` items are links (`href: "#inbox"`), and
  React Native's `List` dropped every item's `href` (`href: _href`), and `ListItem` had no `href`,
  so each row rendered as a disabled `Pressable` with `role="listitem"`. The web bindings make an
  `href` item a link.
- **Fix:** `packages/react-native/src/list-item/list-item.tsx` takes `href`: the item is
  interactive with `role="link"`, and a press calls `onPress` and then
  `Linking.openURL(href)`. `List` passes `href` through. README updated (it said an item's `href`
  isn't followed).
- **Test:** `components.spec.tsx` › "makes an item with an href an interactive link, which a press
  opens".

### 2. Card "Not interactive" scene is interactive

- **Cause: the story generator**, not a dropped boolean. The case's example is
  `{ as: undefined, variant: "outlined" }` over the case's `props.as: "button"`.
  `scripts/generate-stories.ts` writes story args with `JSON.stringify`, which drops
  `as: undefined`, and Storybook's arg merge keeps the component's arg for an `undefined` story arg
  anyway, so the story rendered `as="button"`. Every example that leaves a prop out with
  `undefined` had the same bug (ListItem "link"/"not interactive"/"swipeable…", others).
- **Fix:** the generator names those args in `parameters.pureform.unset`, and
  `src/renderers/multi-render.ts` (`withoutUnset`) drops them before rendering unless a control
  changed them from the component's value.
- **Audit of components for false booleans dropped:** searched React, Solid, React Native and
  binding-core for `||` defaults, `?? true` defaults and truthy-only spreads
  (`...(x ? { x: true } : {})`). Every `?? true` keeps an explicit `false`; the truthy spreads and
  `|| undefined` selections (`connected`, `singleLine`, `toggle`, state maps) drop `false` only where
  the default is already false; `disabled: props.disabled || group.disabled` is the intended
  group/fieldset rule. Card's own `interactive` is read with `??` (`isInteractiveCard`) in every
  binding, and the ready-made cards pass it on. Nothing else to fix.
- **Test:** `apps/storybook-web/scripts/unset-args.spec.ts`; the generated
  `Card.stories.ts` `NotInteractive` now carries `"unset":["as"]`.

### 3. Carousel items are not individually tabbable

- **Cause: the machine, by design.** `@pureform/machines/carousel` gave only the current page's
  mask `tabIndex=0` (roving), and Zag marks items out of view `aria-hidden`.
- **Spec:** M3 carousel accessibility (m3.material.io/components/carousel/accessibility): "use
  Tab to place initial focus on the first carousel item. Then, use Tab or the arrow keys to
  navigate the carousel items"; keys table: "Tab or Arrows — Moves to the previous or next
  carousel item".
- **Fix:** every enabled mask is a tab stop (`tabIndex: 0`; a disabled one `-1`), the current
  page's mask is marked `data-current`, and `getItemProps` drops Zag's `aria-hidden` (a tab stop
  can't be hidden; Tab brings an item into view through the browser's own focus scrolling, so
  scrolling stays native). The arrow keys still move focus and the page. React Native's masks were
  already each a focusable `Pressable`.
- **Case:** `component-cases/src/cases/carousel.ts` reads the page from `data-current`.
- **Tests:** machine, React and Solid carousel specs assert every mask is a tab stop, the first is
  current, and no item is `aria-hidden`; the keyboard and controllable e2e suites pass.

### 4. Navigation bar, rail, tabs: a disabled item has no visual change

- **Cause: the preset.** The items only set `pointer-events: none` while disabled.
- **Spec:** Compose `NavigationBar.kt` / `NavigationRail.kt`
  (`NavigationBarItemDefaults.colors`: `disabledIconColor =
InactiveIconColor.copy(alpha = DisabledAlpha)`, same for the text, and `!enabled ->
disabledIconColor` before `selected`); MDC-Android `tabs/res/color/m3_tabs_text_color.xml` and
  `m3_tabs_icon_color.xml` (`colorOnSurface` at `material_emphasis_disabled`, 38%, for
  `state_enabled="false"`).
- **Fix:** `preset/src/components/navigation.ts` adds `disabledIconColor` and
  `disabledLabelColor` tokens (on-surface-variant at `opacity.disabledContent`); the pill's icon
  color and the item's label take them while disabled, current or not (vertical and horizontal
  layouts). `tabs.ts` adds `disabledContent` (on-surface at 38%) to both variants' tab colors,
  keeping `pointer-events: none`. The active indicator stays as it is (Compose doesn't change it).
- **Tests:** `preset/src/components/navigation-disabled.spec.ts`; snapshots in
  `new-components.spec.ts` re-recorded (only the added disabled rules). Visual sections
  `navigation` and `tabs` unchanged (the fixture page has no disabled destination).

### 5. React Native ripple is very laggy

- **Profile** (Chromium through React Native Web, the default `animated` engine, a temporary
  Profiler spec on a `Button`): a press commits the button 8–12 times (hover, pressed, focus,
  release; 15–40 ms each in development), and the ripple's disc was stepped by Animated from
  JavaScript every frame (`useNativeDriver` is off on the web), so each of those commits stalled
  it: frame gaps of 100–225 ms while it grew. On a device the disc already ran on the native
  driver (UI thread). No React state changed per frame on the default engine.
- **Fix:** `rn-adapter/src/animate/ripple.ts` draws the disc on the web as a plain view whose grow
  and fade are the browser's own animations (`element.animate` on `transform` and `opacity`,
  compositor-run, started in a layout effect before the first paint). Native platforms keep the
  native-driven Animated disc. The ripple's React state changes only on press, release and done.
- **Test:** `indication.spec.tsx` › "grows and fades a ripple with the browser's animations, not
  a style per frame" (the disc has running animations and no attribute writes for 100 ms).

### 6. TimePicker clock hand lags behind a dragged pointer

- **Cause: the machine and preset.** The track's `transform` turns on the `spatialDefault`
  spring, and the hand pointed at the value (whole hours, minutes), so a drag lagged and stepped.
- **Spec:** Compose `TimePicker.kt`: the drag handler calls `state.rotateTo(atan(...))`, which
  `snapTo`s the finger's angle (`animate = false`); `onDragEnd` and `onTap` `animateTo` the value's
  angle (`endValueForAnimation`, the short way).
- **Fix:** the machine keeps `dragTurn` (the pointer's turn once it moves) and `handTurn` (the
  hand's unwrapped turn, moving the short way round: `nearestTurn`). While a pointer drags, the
  hand is at the pointer's turn and the track's inline style is `transition: none`; a press, the
  release, keys, and view changes turn it to the value over the spring. New exports in
  `time-picker.time.ts`: `dialTurnAt(x, y)`, `nearestTurn(turn, from)`, and `dialHand(…, turn?)`.
  React Native's dial follows a moving touch the same way (`dialTurnAt`).
- **Tests:** machine spec › "turns the hand with a dragging pointer at once, and to the value,
  animated, after" and "turns the hand to a new value the short way round"; React Native
  time-picker spec › "turns the hand with a dragging touch itself, onto the value once let go".

## Deviations from the design

- Carousel: every item is a tab stop rather than roving tab index (M3's accessibility page).
- No deprecated options in the touched components had an equivalent to remove.

## Stubs and gaps

- React Native's time picker never animated the hand (the track's `transform` is an inline style
  the engine doesn't tween); it now follows a drag, but jumps still don't animate there.
- The web dial's handle is placed by `left`/`top` with no transition, so on a tap or release the
  track springs while the handle jumps (as before this change).
- The SVG engines: `svg.ts`'s `RippleCircle` still steps SVG props from JavaScript (Animated
  can't drive them natively), and `useTween` (a slot drawing's shape morph and fill blend) sets
  React state every frame. Not on the default engine; `reanimated-svg` already runs CSS
  animations on the UI thread.

## How to verify

- `omni run build test -p @pureform/machines -p @pureform/preset -p @pureform/rn-adapter -p @pureform/react-native -p @pureform/react -p @pureform/solid -p @pureform/component-cases`
  (React Native's suite has load-sensitive timing tests — splitter, FAB menu stagger, snackbar
  queue, tooltip — which failed under load and pass on `-f failed`).
- From `tests/component-suites`, after `omni run generate prepare -p @pureform/panda-fixture`:
  `bunx vitest run -c vitest.config.e2e.ts src/keyboard.e2e.test.ts src/controllable.e2e.test.ts src/indication.e2e.test.ts src/accessibility.e2e.test.ts --project <solid/panda|react/css|react/tailwind> -t "Carousel|TimePicker|Card|List|NavigationBar|NavigationRail|Tabs"`
  (460 passed in each).
- From `tests/browser-e2e-tests`: `bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx -t "(navigation|tabs|carousels|time-pickers|lists|cards) looks the same"` (no re-record).
- `bunx tsc --noEmit -p tsconfig.json` is clean in every touched package except
  `apps/storybook-web`, whose errors are all in `packages/solid/dist/*.jsx` (unchanged here).
- `omni run build -p @pureform/storybook-web` passes.

## Notes for the next phases

- A case example that leaves a prop out with `undefined` works in Storybook now; `null` still
  means a `null` value (progress's indeterminate `value: null`).
- `data-current` marks the carousel's page; read it rather than `tabIndex`.

## Refactoring hints

None: each fix is local to its component; `withoutUnset` is Storybook-only.

## Open questions

- Carousel: Storybook's Carousel stories keep `a11y: { test: "todo" }`, whose comment names
  `aria-hidden-focus`; with no item hidden that rule should now pass, but the pinned copies'
  page reading (the other reason) wasn't rechecked.
- Carousel: a disabled item is out of the Tab order (`tabIndex -1`) but reachable with the
  arrows; M3 doesn't say.
- React Native List: a link item opens through `Linking.openURL`, which on the web opens a new
  window; an app that routes in place should pass `onPress` and no `href`.
- Ripple: the profile's absolute numbers are noisy on a shared machine; the remaining press cost
  is the surface's own re-renders per interaction state, not the ripple.
- Navigation: Compose dims a disabled current destination's icon and label but not its active
  indicator; kept that. The tabs' disabled content is `onSurface` (MDC), the navigation's
  `onSurfaceVariant` (Compose); both at 38%.

# c7c: Avatar image and fallback, list swipe, slider inset icon, search bar width (output context)

Branch `c7c-leftovers`, from main `07eaa67c`. Commits: see `git log 07eaa67c..c7c-leftovers`.
Also in the branch, in its own commit, the date pickers' time-zone fix (below).

Sources, read 2026-10-22 for names and options only (guidelines §1): Zag's avatar (`image`,
`fallback`, load status), Material 3 Expressive's list swipe-to-reveal, slider with an inset icon,
and search bar (max width 720dp). Values marked "unconfirmed" are design calls.

## Built

### Fix: the date pickers' "today" (own commit, `fix(date-pickers)`)

Zag's date picker defaults `timeZone` to `"UTC"`, so its "today" (the `today` cell mark, "today"
in `focusedValue`, presets) was the UTC date: the day before between local midnight and 08:00 at
UTC+8 (Solid's and React's "marks today" tests failed on such a machine). `dateMachineProps`
(binding-core) now passes `timeZone: localTimeZone()` (`Intl.DateTimeFormat().resolvedOptions()
.timeZone`), which every Solid and React date picker, docked picker and date input spreads in. The
React Native calendar never used Zag: its `todayIso()` was already local (a spec pins it). Our own
formatters keep `timeZone: "UTC"` on purpose: they format an ISO date built with `Date.UTC`.

- Specs: `binding-core` `date-picker.spec.ts` ("the local date"), and "marks the local date as
  today, just after / just before local midnight" in the Solid and React `date-picker.spec.tsx`
  (`vi.useFakeTimers({ toFake: ["Date"] })` with `new Date(2026, 7, 15, 0, 30)` and `23:30`).
- The unit configs of `binding-core`, `react` and `solid` now run Chromium with
  `contextOptions: { timezoneId: "Asia/Manila" }`, so the old behaviour fails on any machine
  (checked: with the `timeZone` line removed, Solid's "marks today" and the new spec fail).

### Avatar image and fallback

- **Preset** `avatar.ts` is now a slot component: `root`, `image`, `fallback` (structure
  `root: [image, fallback]`). The root has the old styles plus `overflow: hidden`; `image` is 100%
  by 100% with `objectFit: cover`; `fallback` centres. Neither sets `display`, so the machine's
  `hidden` hides them. `size`, `color` and `shape` set the root only (`clipVariant` is wrapped in
  `onRoot`). `avatar()` now returns a slots map (`avatar().root`), so the css-adapter typing spec
  uses `badge` as its single-part example, and the Panda fixture and css-demo read `.root`.
- **machines** `avatar/` re-exports Zag's avatar (`@zag-js/avatar`, new dependency, catalog
  `^1.46.0`; `bun.lock` gains only that entry) under `@pureform/machines/avatar` (export, vite
  entry, README rows), with the drift test pair.
- **binding-core** `avatar.ts`: `AvatarRootOwnProps` (variants, `label`, `onStatusChange`, `id`,
  `testId`, `unstyled`), `AvatarContentProps` (`src`, `children`), `avatarMachineProps`,
  `avatarRootProps(props)` (`role="img"` + `aria-label`, or `aria-hidden`). `avatarElement` is
  gone, and so is `src` on Root: the root is never an `<img>` now.
- **Solid and React** `avatar/`: `Avatar.Root`, `Avatar.Image` (`img`, `alt=""`; the root names the
  avatar), `Avatar.Fallback`; the ready-made `<Avatar src label>AL</Avatar>` renders Image and
  Fallback with a `src`, and the children alone in the root without one. In Solid the machine runs
  inside `Image` and Root keeps a `loaded` signal the fallback hides for (an avatar of initials,
  the usual row leading, sets up no machine); in React the machine runs in Root.
- **React Native** `single-part.tsx`: `Avatar` takes `src` (an `Image` that stays mounted but
  takes no room until loaded; `onStatusChange`), the children are the fallback `Text`.

### List swipe to reveal (contained in `list-item.ts`)

- **Preset** `list-item.ts`: a new slot `action` (last child of `root`, absolutely pinned to the
  end, `actionContainer` / `actionContent` tokens, `swipeWidth` 80), and a `swipeable` variant
  (`false`/`true`, default `false`, 0 compounds). `true` clips the root and slides `leading`,
  `content`, `trailing` and `trailingText` by the `swipeOffset` token (pixels, `0..swipeWidth`,
  toward the inline start; a `when("rtl", …)` flips it). The offset is a **token transition**
  (`rowTokens` gained an optional `valueTypes` argument, `swipeOffset: "number"`), so the parts
  slide on a settle without becoming views that move: React Native's `movingSlots` for `listItem`
  stays `root` only. No transition while the root is `pressed` (the drag sets that state).
- **binding-core**: new `list-item-swipe.ts` (props `revealed`/`defaultRevealed`/`onRevealedChange`/
  `swipeWidth`, `swipeOffsetOf`, `swipeSettlesOpen`, `swipeRestOffset`, `swipeKeyAction`,
  `swipeTokens`) with a spec; `list-item.ts` gains `swipeable` (variant prop and selection),
  `swipeAction` (content), and the swipe prop keys; `listItemVariants` (`list.ts`) passes
  `swipeable`.
- **Solid and React**: the gesture lives in a new `list-item/swipe.ts` (`createSwipe` /
  `useSwipe`), so `list-item.tsx` changes are a few contained lines (context value, selection
  tokens, root machine props, the `Action` part and `swipeAction`). Pointer drag past a 6px slop
  (a drag isn't a click), release settles open past half; `touch-action: pan-y`; `tabIndex 0` on a
  non-interactive row, ArrowLeft/ArrowRight (by direction) reveal/close, Escape closes; the action
  is `inert` until revealed. Solid builds the swipe state only for a row that is swipeable when it
  is made (so other rows keep their reactive-node budget).
- **React Native**: a swipeable item renders `root.View` with a `PanResponder` (and the web key
  hook), not a `Pressable`, so a swipeable item can't also take `onPress`; the action is
  `aria-hidden`, `pointerEvents: none` until revealed.

### Slider inset icon

- **Preset** `slider.ts`: a new `insetIcon` slot between the markers and the handle, positioned at
  the active track's start (`insetIconSize` icon medium, `insetIconPadding` 8, `iconFill`), in the
  group's on-colour (dimmed when disabled), vertical orientation placed from the bottom. Its
  `opacity` is `insetIconShown * bar`: `size` sets `insetIconShown` (0 for `xsmall`/`small`, 1 from
  `medium`), and the round handle's thin track has none. It is a flag, not `display`, so no
  variant group overlaps another (`variant-overlap` passes).
- **machines** `slider`: `insetIcon` in the anatomy and `getInsetIconProps()`. `anatomy.spec` and
  `icons.spec` list `slider: ["insetIcon"]` (it takes `mirror`).
- **Bindings**: Solid and React `InsetIcon` part and an `insetIcon` prop on the ready-made slider;
  React Native `insetIcon` prop (`IconSlot`).

### Search bar max width

`searchBar` gains `maxWidth` (720px, M3 Expressive's) on `root`. "Lift on scroll" is the `scrolled`
variant (c3c/c4b): the bar already rests at elevation 3 and the app bar's scroll behaviour sets
`scrolled`, so no extra elevation. 0 compounds.

## Tests

- Preset: `avatar.spec`, `expressive.spec` (inset icon, swipeable, search bar max width), snapshots
  (avatar, listItem, searchBar, slider) updated; whole preset suite passes (1048).
- binding-core (`list-item-swipe.spec`, `display.spec`, `date-picker.spec`), machines, anatomy
  (regenerated: `insetIcon`, `action`, avatar parts).
- Solid and React: avatar (loads, fails, no picture, decorative), list item swipe (drag open and
  closed, short drag stays closed, keys, `defaultRevealed`, inert), slider inset icon.
- React Native (`components.spec.tsx`, "c7c"): avatar fallback, swipe action, slider inset icon,
  search bar `maxWidth`.
- Component suites: `Avatar` (picture, picture with a fallback, failed picture), `Slider`
  (inset icon, horizontal and vertical), `ListItem` (swipeable, revealed) pass on every binding
  and target; the avatar case is `measured: true` because a picture that loads after hydrating
  swaps itself in for the fallback. Not run: the browser screenshots (the Panda fixture gained a
  large slider with an inset icon and the avatar's new markup, so `sliders` and `avatars`
  screenshots need re-recording by the merge).
- Targeted `omni run build test -f all` for anatomy, binding-core, machines, preset, solid, react,
  react-native, css-adapter, rn-adapter, bundler passed. (`component-suites` once failed an
  Autocomplete controlled test under load; it passes alone.)

## Merge notes

- **`list-item.ts` with c7b (expandable).** Preset: my changes are the imports, three tokens, the
  `slides` helper, one slot (`action`, last in `slots` and in `structure.root`), the `swipeable`
  variant group, its default, and the `valueTypes` argument to `rowTokens`. A c7b `expand` slot or
  variant group should merge as a union; if both append to `structure.root`, keep `action` last.
  Bindings: `swipe.ts` is a new file in Solid and React; `list-item.tsx` changes are in the
  context value, `Root`'s selection and machine props, `Action`, and the ready-made's `swipeAction`.
  binding-core `list-item.ts`: `swipeable` and `swipeAction` entries next to c7b's props.
- `packages/anatomy/src/generated.ts`: rerun `generate` (never merge by hand).
- Gap analysis: only my rows (list swipe, search bar max width, slider inset icon, avatar
  `image`/`fallback`) are edited. The "Later" summary list (§7 verdict row) still names slider
  inset icon, avatar image/fallback and search bar max width, and the §1.8 matrix says avatar 🟡:
  update with the totals.
- The Solid row-cost budget (`row-cost.spec.tsx`) went from 68 to 75 reactive nodes: the leading
  avatar of the measured row is now a root (a loaded signal and a `Show`) instead of one part.
- The unit configs' `Asia/Manila` timezone applies to the whole `binding-core`, `react` and `solid`
  unit suites.
- `bun.lock`: only `@zag-js/avatar`.

## Refactoring hints

- **Helpers that look generic:** `swipeOffsetOf` / `swipeSettlesOpen` (binding-core
  `list-item-swipe.ts`) are a pointer-drag-to-open pattern any drawer, bottom sheet or snackbar
  swipe could share (the snackbar's swipe-to-dismiss and side sheet dragging each have their own).
  `useSwipe` and `createSwipe` (`list-item/swipe.ts`) are the framework forms.
- **Code that looks like a sibling's:** Solid's and React's `swipe.ts` mirror each other; the
  Solid and React avatar and slider parts follow the existing `drawn` part pattern.
- **Suggested home:** a drag helper in binding-core's `dom.ts` if a second swipe component lands.
- **What must not change:** the list item's non-swipeable output (the preset snapshot's
  `swipeable.false` is `{}`), `movingSlots("listItem")` is `root` (rn-adapter `factory.spec`), the
  row-cost budget, and the date pickers' local "today" specs.

## Open questions

- **Avatar root is no longer an `<img>`** with a `src`: apps that styled the img via `Avatar`'s
  class now get a span with an inner `img`. The old behaviour has no equivalent (it had no
  fallback); say if a compatibility path is wanted.
- **Swipe action colour and width** (`secondaryContainer`, 80px) are unconfirmed; a destructive
  action would want `errorContainer`. A swipeable item can't be a link or button, and a React
  Native one can't take `onPress`. Swipe past the full width to trigger the action is not built.
- **The inset icon doesn't clip** when the active track is shorter than the icon (a value near 0):
  it sits over the inactive track. M3 doesn't say; hiding it below a threshold would need a
  clipped track part.
- **Search bar lift on scroll** is read as the existing colour change; if M3 means a higher
  elevation at rest-to-scrolled, `scrolled` could also set a shadow level.
- The avatar machine runs in `Image` in Solid and in Root in React (cost versus symmetry).

## Resolved after the merge (c7-merge)

- **Search bar lift on scroll (resolved):** the bar is flat. Compose's `SearchBarDefaults`
  `ShadowElevation` and `TonalElevation` are `ElevationTokens.Level0` (androidx-main
  `SearchBar.kt`), so the root's `surface(…, "level3")` is now `level0`. The container stays
  `surfaceContainerHigh`, and `scrolled` still takes `surfaceContainerHighest`: that colour change
  is the whole lift on scroll. Specs: preset `expressive.spec.ts`, the browser suite's
  `visual.e2e.test.tsx` (no box shadow) and React Native's `components.spec.tsx`.
- **Inset icon clipping (resolved):** as Compose's `SliderWithTrackIconsSample`, the icon (now
  20px, `insetIconPadding` 10px) sits at the start of the active track in `insetIconColor`
  (`onPrimary`, the group's on-colour under `color`) while the active track is at least the icon
  and its padding either side; otherwise at the start of the inactive track, after the handle's
  gap, in `insetIconOutsideColor` (`onSecondaryContainer`). It's never clipped or drawn across
  the boundary. Placement is a state, not a variant: a new mark condition `overflowing` (core
  `MarkCondition`, `data-pf-overflowing` in `STATE_ATTRIBUTES`, css-lowering's selector, the
  rn-adapter state), set by the bindings from binding-core's `sliderInsetIconOverflows` (the
  root's measured length: a `ResizeObserver` on the web, `onLayout` on React Native) with the
  icon's measures in `SLIDER_INSET_ICON`. A theme that changes `insetIconSize` or
  `insetIconPadding` should change those too. Specs: binding-core `display.spec.ts`, Solid and
  React `slider.spec.tsx`, React Native `components.spec.tsx`, preset `expressive.spec.ts`;
  `variant-overlap.spec.ts` still passes.
- **Swipe action colour and width (resolved):** the action keeps `secondaryContainer` /
  `onSecondaryContainer` by default; a new `actionColor` group (`secondary`, `error`) points the
  `actionContainer` / `actionContent` tokens at `errorContainer` / `onErrorContainer` for a
  destructive action (tokens only, so `variant-overlap.spec.ts` passes; 0 compounds). The 80px
  width is the `actionWidth` token (was `swipeWidth`; the bindings' `swipeWidth` prop still sets
  it through `swipeTokens`). Specs: preset `expressive.spec.ts`, binding-core
  `list-item-swipe.spec.ts`, Solid and React `list-item.spec.tsx`, React Native
  `components.spec.tsx`.

## Merge resolution (c7-merge)

- **`list-item.ts` (preset):** union of both sides. Tokens: c7c's action and swipe tokens plus
  c7b's `regionIndent`. `slots`: `…, indicator, region, action`; `structure.root` ends
  `indicator, action` (action last, as asked). Parts: c7b's `indicator`/`region` and c7c's
  `action`. The description names both.
- **Expandable and swipeable together:** the API allows both props, but an expandable item's
  root is a button and the swipe action is a button inside the root, so the pair would nest a
  button in a button. Resolved as: **an item with a `region` doesn't swipe** (its `swipeAction`
  is ignored; `swipeable` is forced false). Solid and React `Root` skip the swipe state inside
  an `Expandable`; the ready-made rows render no `Action`; React Native's `swipeable` excludes
  `expandable`. Specs: "a ListItem with both a region and a swipe action" (Solid, React) and "keeps
  an item with both a region and a swipe action expandable, without the action" (React Native).
  Making both work would need the action outside the button root (a restructure for r6).
- **Bindings:** React/Solid `Root` combine the accordion trigger props, the interaction handlers
  (not for an expandable header) and the swipe root props; React Native's swipe branch and the
  expandable row (indicator, region) both kept. Solid's duplicated `isPresent` import fixed.
- **m1 overlap:** none of the c7 branches touched m1's motion files (springs, emphasized
  `linear()`, tween and overlay types); `slider.ts` differed only by m1's formatting, kept.
- **Row-cost budget:** accepted at 75 for Solid (the avatar root's loaded signal and `Show`); the
  budget spec passes after the merge.
- **Found in the gate:** the swipe action's `width` read the unitless token directly (CSS
  `width: 80` is invalid, so the web action was 0px wide; rn-parity caught it); it's now
  `actionWidth × 1px`.
- Indication fixtures were re-recorded (additions only vs main: 38 lines each); screenshots
  re-recorded: `progress` (the inset icon slider), `app-bars`, `search-and-feedback` and
  `search-and-autocomplete` (the flat search bar).
- **Gate flakes:** Solid's unit suite failed twice with "iframe did not become ready" (tabs, then
  toolbar). The cause was Vite discovering `@zag-js/*` dependencies mid-run (c7 added `avatar`
  and `listbox`) and reloading; Solid's `optimizeDeps.include` named machine dependencies by bare
  name, which it can't resolve. Both bindings now pre-bundle every machine dependency
  (`@pureform/machines > @zag-js/…`), and cold-cache runs no longer reload. The component suites'
  indication "Failed to fetch dynamically imported module" (known flake) happened once and passed
  on the next run.

# Parked for later

Relevance review: 2026-10-27, after the platform-boundary refactor. See
[the follow-up plan](todo-later-plan.md) for priorities
and verification gates. Items below are not all reproduced bugs: device checks, design
questions, and older reports awaiting reproduction remain explicitly deferred.

- **Hover flicker** (Solid, React): the highlight flickers when hovering items in the Menu Default
  story (open with its button) and, intermittently, navigation bar items. Seen in a desktop
  browser; not reproduced headless (fix-storybook-6a swept 1px at a time). Needs a screen
  recording, the browser and the pointing device. Suspect: React's menu highlight trails the CSS
  hover by ~50 ms; the first item counts as hovered for one frame on open.
- **Device checks** (only tested on React Native Web so far):
    - NativeSelect's iOS and Android menu;
    - the SVG engine's device paths (native-driver ripples, morphs written to native paths);
    - React Native toast swipe;
    - container measuring for Menu `submenu="auto"` (`measureInWindow`);
    - TouchTarget on Android (`useTouchTargetSlop`).

## Follow-ups from the component roadmap's batch notes

Still open when the batch notes (`docs/roadmap-components/context/` and the first roadmap's
`docs/roadmap/context/`, now only in git history) were pruned. Open questions already listed in
[next.md §3](roadmap-components/next.md#3-open-questions-from-the-contexts) aren't repeated.

### Accessibility

- Snackbar: announces only by showing a hidden `role="status"` region, which some screen
  readers miss; inserting the message would be more reliable.
- Screen reader ("virtual") clicks are never emitted; `"virtual"` is only a fallback pointer type
  (machines `interaction/emitter.ts`).

### Menus

- Menu `submenu="auto"`: recheck resizing, scrolling and changing content while open,
  and separately verify Native measuring before adding live observers.
- React Native drill: height animates but width jumps; the whole row moves rather than its
  label; other rows don't fade. React Native's cascading submenu isn't in the arrow-key loop on
  React Native Web.
- Hover flicker (above): a suggested fix is drawing pointer hover only from `:hover` and the
  keyboard highlight as focus; it changes menus on every web binding.

### Motion and progress

- Page transitions: recheck visual continuity when an entering page becomes a leaving one.
- Fade through: web drops `data-state` once settled, React Native keeps `entering`. Uses theme
  roles (`short2`/`short4`, `spatialDefault`) rather than Compose's 90/210 ms and default spring.
- Horizontal shared axis: verify whether a named theme with another surface still needs to set
  `scrimOpacity` explicitly.
- FAB menu: items scale from their own centre, not from the FAB (no `transform-origin` in
  preset `fab-menu.ts`); a composed `FabMenu.Root` counts items after mount, so server
  rendering falls back to eight steps until hydration.
- Linear wavy progress: the wave rides with the sliding bar; Compose moves it along the track
  at one wavelength per second. Indeterminate wavy runs a flat track under the whole bar
  without Compose's gaps; on React Native the linear indeterminate track has no gap window
  (needs two views).
- SVG device validation: verify actual path updates and finite odd iteration counts on devices.
- Tabs/springs: a spring slide with a `delay` waits with `setTimeout`; a factory instance can't
  pass a spring token.
- Reduced motion nested three deep (`reduce` in `full` in `reduce`) doesn't resolve: the
  innermost `reduce` loses (`css-lowering/src/motion.ts` selectors go two levels).
- Panda's `_motionSafe` and Tailwind's `motion-safe` follow only the system setting, not the
  provider's motion.

### Components

- Swipeable list row: its focus ring draws inside (the frame clips it).
- Slider: the icon button's focus ring inside it is clipped to 1px; handle clearance isn't
  themed; no styled web test for the slider reader. The value indicator doesn't show on
  keyboard focus as M3 does.
- React Native sheets slide by the window's size, not their own; "refused" is decided one frame
  after the close request, so an async confirm settles back first.
- Bottom sheet: `onExpandedChange` also fires when an uncontrolled sheet reopens at another
  rest; undecided whether only drags and presses should fire it.
- Splitter: the machines wrapper patches Zag internals (`resizeObserver` measure): recheck on Zag
  upgrades. Zag's long press is 700 ms; set 500 ms if Zag exposes it.
- Chip: the pill radius is a root token now, so a theme's `components.chip.radius` no longer
  reaches the round corner.
- Docked date picker: the `actions` part is defined but never rendered by the React and Solid
  ready-mades; React Native hardcodes `testID="pf-docked-date-picker-trigger"`.
- Calendar cells: on the web, month/year cells always report `today`/`outside` false; React
  Native marks the current year.
- NativeSelect: value typing differs (React/React Native a union, Solid a discriminated type);
  `@react-native-menu/menu` paths (`multiple`, `keepsMenuPresented`) need a device check before
  the peer is advertised; `ripple` stays in its usage for the Material Menu fallback.
- Forms: no forms-suite case submitting FileUpload `File` entries; no geometry spec guards the
  rating's half star width; no Solid unit spec for server rendering a controlled textarea.
- Select: no `multiple` (`Select<string[]>`) though component-architecture §9.4 describes it.
- Ready-made snackbar: its action and close buttons don't take `interactionSource`.
- Direction: the web `rtl` condition matches an ancestor, so an `ltr` part inside an `rtl` page
  matches both; `&:dir(rtl)` with Panda's condition overridden would fix it
  (css-lowering `conditions.ts`, panda-adapter `_rtl`, Tailwind's `rtl:` variant, snapshots).

### Slot props

- Per-item keys: ButtonGroup, ChipSet, Toolbar and RadioGroup items take only `testId`;
  per-item `className`/`tokens` need `InnerPropsOf` on their item types, as List has.
- On Solid a string `menuProps.style.root` on Toolbar is dropped while the menu is hidden; SplitButton/Toolbar
  `menuProps` have no per-item functions.
- React Native: triggers drawn as `Button` (dialog, menu, date picker) and the menu's
  `contextTrigger` have no part key; FabMenu items share test ids; NativeSelect has no option
  parts. No provider-level `slotProps` on React Native (undecided whether it should have them).
- Ripple's `ripple` elements take only the registry class, no `className`/`style`/`slotProps`.
- Indication: the ripple's opacity comes from the theme's pressed opacity, not the surface's
  `statePressedOpacity`, so `indication` doesn't change it (`it.fails` in `indication.e2e.test.ts`).
- Indication: a `components.<c>.<indication token>` override in a provider or named theme never
  reaches the component; each root resets those tokens (`it.fails` in the same file).

### Tooling

- tailwind-demo `generate`: reproduce overlapping runs with different plans: pruning may still
  remove another run's files. Prefer per-output serialization or a transactional swap, not clearing
  app-owned files.
- Open choices: run the node type checks in `build` (now in `check:types`); rename
  `tsconfig.project.json`.
- The plain `.pureform/` entry is typed from the first web target; multi-target code needing
  native factory types imports `.pureform/native`. Revisit if it confuses users.
- Bundler pruning keeps every token, theme, `@property`, keyframes and shape, most of the CSS
  left; dropping keyframes and shape paths no kept rule reads is the next step.

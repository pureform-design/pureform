# Parked for later

Relevance review: 2026-10-29, after the platform-boundary refactor and follow-up regressions. See
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

- Snackbar announcements and click-only ("virtual") activation are covered by DOM and API spies
  only: the persistent live region, the single iOS `announceForAccessibility` call per message,
  and one virtual press/release per click. Actual speech and assistive-technology click delivery
  still need VoiceOver, TalkBack, NVDA or JAWS; DOM tests can't show them.

### Menus

- Menu `submenu="auto"`: recheck resizing, scrolling and changing content while open,
  and separately verify Native measuring before adding live observers.
- React Native drill: height animates but width jumps; the whole row moves rather than its
  label; other rows don't fade.
- Hover flicker (above): a suggested fix is drawing pointer hover only from `:hover` and the
  keyboard highlight as focus; it changes menus on every web binding.

### Motion and progress

- Page transitions: recheck visual continuity when an entering page becomes a leaving one.
- Fade through uses theme roles (`short2`/`short4`, `spatialDefault`) rather than Compose's
  90/210 ms and default spring.
- FAB menu: items scale from their own centre, not from the FAB (no `transform-origin` in
  preset `fab-menu.ts`); a composed `FabMenu.Root` counts items after mount, so server
  rendering falls back to eight steps until hydration.
- Linear wavy progress: the wave rides with the sliding bar; Compose moves it along the track
  at one wavelength per second. Indeterminate wavy runs a flat track under the whole bar
  without Compose's gaps; on React Native the linear indeterminate track has no gap window
  (needs two views).
- SVG device validation: verify actual path updates on devices.
- Reduced motion nested three deep (`reduce` in `full` in `reduce`) doesn't resolve: the
  innermost `reduce` loses (`css-lowering/src/motion.ts` selectors go two levels).
- Panda's `_motionSafe` and Tailwind's `motion-safe` follow only the system setting, not the
  provider's motion.

### Components

- Swipeable list row: its focus ring draws inside (the frame clips it).
- Slider: the icon button's focus ring inside it was reported clipped to 1px; obtain the
  nested-icon-button scene before changing clipping. Handle-clearance theming and the styled
  inset-icon reader are already covered by `slider-inset-icon.e2e.test.ts`.
- Bottom sheet: `onExpandedChange` also fires when an uncontrolled sheet reopens at another
  rest; undecided whether only drags and presses should fire it.
- Splitter: the machines wrapper patches Zag internals (`resizeObserver` measure): recheck on Zag
  upgrades. Zag's long press is 700 ms; set 500 ms if Zag exposes it.
- Chip: the pill radius is a root token now, so a theme's `components.chip.radius` no longer
  reaches the round corner.
- Docked date picker: the `actions` part is defined but never rendered by the React and Solid
  ready-mades.
- NativeSelect: value typing differs (React/React Native a union, Solid a discriminated type);
  `@react-native-menu/menu` paths (`multiple`, `keepsMenuPresented`) need a device check before
  the peer is advertised; `ripple` stays in its usage for the Material Menu fallback.
- Select: no `multiple` (`Select<string[]>`) though component-architecture §9.4 describes it.

### Slot props

- Per-item keys: ButtonGroup, ChipSet, Toolbar and RadioGroup items take only `testId`;
  per-item `className`/`tokens` need `InnerPropsOf` on their item types, as List has.
- SplitButton/Toolbar `menuProps` have no per-item functions.
- React Native: NativeSelect has no option parts (its web options and the OS-owned menus need
  different contracts). No provider-level `slotProps` on React Native (undecided whether it
  should have them).

### Tooling

- Open choices: run the node type checks in `build` (now in `check:types`); rename
  `tsconfig.project.json`.
- Bundler pruning keeps every token, theme, `@property`, keyframes and shape, most of the CSS
  left; dropping keyframes and shape paths no kept rule reads is the next step.

# Parked for later

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

- Open roles: should the web search view trigger (a plain `div`) get one; should React Native's
  select be a listbox rather than a menu; a never-set rating reads as one star (Zag marks the
  first star checked at 0).
- FabMenu: items are both Tab stops and Zag's arrow-key highlight targets, and an arrow key
  moves focus back to the list (`focusMenu`); unify the two focus models.
- Snackbar: announces only by showing a hidden `role="status"` region, which some screen
  readers miss; inserting the message would be more reliable.
- Screen reader ("virtual") clicks are never emitted; `"virtual"` is only a fallback pointer type
  (binding-core `emitter.ts`).

### Menus

- Menu `submenu="auto"`: the room check uses the parent menu's width, so a submenu wider than
  its parent can still flip and overlap; it measures once per open plus on window resize.
- React Native drill: height animates but width jumps; the whole row moves rather than its
  label; other rows don't fade. React Native's cascading submenu isn't in the arrow-key loop on
  React Native Web.
- Hover flicker (above): a suggested fix is drawing pointer hover only from `:hover` and the
  keyboard highlight as focus; it changes menus on every web binding.

### Motion and progress

- Page transitions: a change during a change jumps: the page model keeps two pages, so the
  entering page becomes the leaving one and restarts (binding-core `page-transition.ts`).
- Fade through: web drops `data-state` once settled, React Native keeps `entering`. Uses theme
  roles (`short2`/`short4`, `spatialDefault`) rather than Compose's 90/210 ms and default spring.
- Horizontal shared axis: is the `scrim` wanted outside predictive back? A named theme with
  another surface keeps the base theme's scrim opacity unless it sets `scrimOpacity`.
- FAB menu: items scale from their own centre, not from the FAB (no `transform-origin` in
  preset `fab-menu.ts`); a composed `FabMenu.Root` counts items after mount, so server
  rendering falls back to eight steps until hydration.
- Linear wavy progress: the wave rides with the sliding bar; Compose moves it along the track
  at one wavelength per second. Indeterminate wavy runs a flat track under the whole bar
  without Compose's gaps; on React Native the linear indeterminate track has no gap window
  (needs two views).
- `ReanimatedSvgDrawing` may not run `drawing.keyframes` (loading indicator would only turn);
  on the Animated fallback `alternate` runs as `normal`. Unconfirmed.
- Tabs/springs: a spring slide with a `delay` waits with `setTimeout`; a factory instance can't
  pass a spring token.
- Reduced motion nested three deep (`reduce` in `full` in `reduce`) doesn't resolve: the
  innermost `reduce` loses (preset `motion.ts` selectors go two levels).
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
- Toast exits with CSS `scale` rather than `overlayShrinkOut`.
- Table sort: on an unsorted column the hover hint points up even with `sortStart: descending`.
- Splitter: the web settle sets `flex-grow` on panes, overwriting an app's inline `transition`;
  the machines wrapper patches Zag internals (`resizeObserver` measure): recheck on Zag
  upgrades. Zag's long press is 700 ms; set 500 ms if Zag exposes it.
- Chip: the pill radius is a root token now, so a theme's `components.chip.radius` no longer
  reaches the round corner.
- `OWN_SIZE`: Radio, the split button root and the FAB menu don't use it, so they may stretch
  in a React Native column.
- React Native date input: segments read `value` once (an outside change doesn't update them);
  separators are tighter than the web's.
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
- Slider: `--pf-components-slider-stateLayerColor` is declared but read by no style (listed
  `unread` in `codegen.spec.ts`); wire it or remove it.
- Direction: the web `rtl` condition matches an ancestor, so an `ltr` part inside an `rtl` page
  matches both; `&:dir(rtl)` with Panda's condition overridden would fix it.

### Slot props

- Per-item keys: ButtonGroup, ChipSet, Toolbar and RadioGroup items take only `testId`;
  per-item `className`/`tokens` need `InnerPropsOf` on their item types, as List has.
- FileUpload's `error` part isn't spread from keyed props; on Solid a string
  `menuProps.style.root` on Toolbar is dropped while the menu is hidden; SplitButton/Toolbar
  `menuProps` have no per-item functions.
- React Native: triggers drawn as `Button` (dialog, menu, date picker) and the menu's
  `contextTrigger` have no part key; FabMenu items share test ids; NativeSelect has no option
  parts; `TagsInput` ignores `chipProps.testId`; ColorPicker's hex `slotProps.input` merges
  shallowly, so the picker's handlers replace the user's. No provider-level `slotProps` on
  React Native (undecided whether it should have them).
- Ripple's `ripple` elements take only the registry class, no `className`/`style`/`slotProps`.
- Indication: the ripple's opacity comes from the theme's pressed opacity, not the surface's
  `statePressedOpacity`, so `indication` doesn't change it (`it.fails` in `indication.e2e.test.ts`).
- Indication: a `components.<c>.<indication token>` override in a provider or named theme never
  reaches the component; each root resets those tokens (`it.fails` in the same file).

### Tooling

- tailwind-demo `generate`: overlapping runs can leave `.pureform/index.ts` naming files that
  run didn't write; write atomically or clear `web/` first.
- Open choices: run the node type checks in `build` (now only `check:types`); rename
  `tsconfig.project.json`; Vite/Vitest config files aren't type-checked by any tsconfig.
- The `IndicationPlatform` augmentation from `@pureform/binding-dom/indication` puts
  `HTMLElement` into any program loading it, including mixed web + React Native type checks;
  a generic `Indication<E>` is the alternative.
- The plain `.pureform/` entry is typed from the first web target; multi-target code needing
  native factory types imports `.pureform/native`. Revisit if it confuses users.
- Bundler pruning keeps every token, theme, `@property`, keyframes and shape, most of the CSS
  left; dropping keyframes and shape paths no kept rule reads is the next step.
- css-demo and tailwind-demo still draw components with `useClasses` although Solid components
  exist for them.

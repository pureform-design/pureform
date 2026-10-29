# Follow-up plan: easiest to hardest

Reviewed and decisions agreed 2026-10-29. This is a source/test audit and agreed implementation
plan, not a claim that historical visual reports have all been reproduced. Numbers replace the
old B/C/D/E identifiers. Complexity estimates are relative and may change after reproduction.

## Working rules

- Work one numbered item at a time, from easiest to hardest when its prerequisites are available.
- Start behavior changes with a failing regression or recorded reproduction. For stale reports,
  add verification coverage and retire with evidence instead of manufacturing a failing test.
- Agreed contracts below guide implementation; API names and implementation details still need
  to follow established conventions. Preserve override precedence, caching and reactive behavior.
- Validate affected bindings/adapters, SSR/hydration and reduced motion where relevant. Review
  targeted snapshots; do not regenerate them wholesale. Remove resolved backlog entries.
- Device/AT verification is a separate lane. Unavailable hardware is blocked, not passed, and
  must not block unrelated work. Reproduction-gated items can move later in the queue.
- Commit related changes in batches and push after validation.

## B. Bounded component work — low to moderate complexity

## C. Shared APIs and motion — moderate to high complexity

### 10. FAB-menu Compose-style motion

- Current source report: items scale from their centers. The agreed reference is current Compose
  Material 3, not spatial movement from the FAB or a simple transform-origin change.
- Stagger starting nearest the FAB; animate item width and opacity at fixed height from the menu's
  aligned edge (end by default, mirrored in RTL). Reverse visibility sequence on closing.
- Compose uses SlowEffects/FastSpatial/FastEffects for stagger/width/opacity. Retain theme-controlled
  motion and reduced-motion support rather than hardcode an unrelated animation policy.
- Reproduce current motion, test direction/alignment and rapid toggles, and integrate with count
  and hydration behavior from 7.
- Agreed architecture: generic runtime animation coordination and driver contracts live in
  `animate-core`, separate from the styling AST's `core`. `animate-web` and `animate-react-native`
  depend on and wrap it with Motion-like public APIs; applications import adapters, not core.
  Web drivers are shared by React/Solid, with lifecycle hooks in the existing bindings. Native
  drivers must retain native/UI-thread execution where possible. Generic stagger coordinates
  visibility; FAB-menu owns width measurement and item motion. Distinguish fixed-delay stagger
  from spring-driven visibility progression. Scaffolded with Omni; runtime implementation pending.
- Adapters choose the fastest compatible platform abstraction, not a lowest-common-denominator
  JavaScript frame loop: browser-native animations/compositor paths on web, Animated's native
  driver for supported properties and Reanimated UI-thread execution on Native. Layout properties
  require capability-specific paths; do not promise compositor/native-driver width animation.
  Keep stagger coordination driver-local where supported, with boundary/lifecycle notifications
  instead of per-frame framework renders. Fallbacks preserve interruption, cleanup and reduced
  motion. Verify driver selection and profile actual performance, including devices.

### 11. Arbitrarily nested motion providers and provider-aware motion-safe

- Source-supported limitation: CSS reduced-motion selectors handle limited provider nesting;
  Panda `_motionSafe` and Tailwind `motion-safe` currently follow only the system setting.
- Agreed contract: nearest provider wins at any depth. `system` follows the OS even inside an
  explicit override; `full` enables normal motion even when the OS requests reduction; `reduce`
  requests reduced motion. Motion-safe uses the same effective setting.
- Regress `reduce → full → reduce`, reverse and system combinations before selecting an approach.
- Validate CSS, Panda, Tailwind, SSR and hydration together; preserve consistent provider behavior
  across platforms and avoid selectors that only handle another fixed nesting depth.

### 12. Linear wavy progress motion and gaps

**Historical report; reproduce before implementation.**

- Wave reportedly rides with the sliding bar; indeterminate track runs continuously underneath it.
  Native lacks the track gap window, requiring separate visible track segments.
- Agreed reference: Compose geometry and default wave motion, track-relative at one wavelength
  per second independently of indicator movement, with gaps around the active indicator.
- Specify geometry and both visible track segments in tests before implementing Native gap windows.
- Preserve theme overrides; cover determinate/indeterminate modes, RTL, reduced motion and web/Native parity.

### 13. Native submenu drill geometry and motion

**Historical report; device reproduction required before motion changes.**

- Report: height animates but width jumps, whole row translates instead of its label, siblings do not fade.
- Agreed target: animate measured panel width/height, translate labels in the navigation direction
  and fade nonparticipating rows. Reverse for back navigation and mirror for RTL.
- Use existing theme springs and respect reduced motion. Validate iOS/Android with both engines.
- Cascade arrow navigation passes on Native Web in LTR/RTL, not yet verified on devices.

## D. Lifecycle and architecture — hardest

### 14. Interrupted page transitions

**Historical report; reproduce before changing page lifecycle.**

- Preserve current visual position/opacity when an entering page becomes a leaving page and keep
  outgoing identity through exit. Reuse/reverse returning pages where practical without duplicates.
- Latest navigation wins immediately; do not queue intermediate transitions.
- Test rapid A → B → A and A → B → C changes under default/custom themes and reduced motion.
- Native FadeThrough already settles its page model without restarting presence; preserve that.
- Agreed timing policy: retain theme roles (`short2`/`short4`, `spatialDefault`), not exact Compose
  90/210 ms timings or its default spring. Numerical timing parity is not a separate backlog task.

### 15. Live auto-submenu adaptation across platforms

- `submenu="auto"` already exists and is the default; currently its choice is made on opening.
- Agreed contract: react to layout changes while open on all platforms, adapting cascade ↔ drill
  in both directions while preserving the active submenu and keyboard focus.
- Observe relevant resize, scroll/clipping, container and content changes, including delayed/wider
  content. Switch back to cascade when space returns.
- Use a small stability margin to prevent boundary oscillation; determine its exact value in tests.
- Explicit cascade/drill modes remain explicit. Test lifecycle/observer cleanup and integrate with
  Native exit/drill work (5, 13); verify Native measurement on devices, not just Native Web.

### 16. Select multiple-value mode

- Add a mode of Select, not a separate MultiSelect component. NativeSelect already has multiple mode.
- Tight discriminated types: omitted/false `multiple` accepts scalar values/defaults and scalar
  callbacks; `multiple: true` accepts arrays and array callbacks. Reject mismatches in compile-time
  tests across bindings; no loose scalar-or-array union.
- Toggle options without closing in multiple mode, show selection checkmarks, retain keyboard
  navigation with Enter/Space toggling, and submit repeated fields under the same form name.
- Provide a sensible selection summary customizable through established content conventions.
- Design accessibility and React/Solid/Native parity together. Searchable options and removable
  chip-input experiences are not implied by this scope. Test form serialization and keyboard/AT semantics.

### 17. Conservative keyframe and shape pruning

- Measure full/pruned CSS bytes and asset counts first, then track references from kept output.
- Prune only demonstrably unused keyframes and shape paths. Keep runtime theme/variant references
  and dynamic/unknown uses conservatively; correctness wins over maximum size reduction.
- Test runtime theme switches and dynamic-reference safety alongside output measurements.
- Token/theme/`@property` pruning is deferred to F2, not part of this implementation.

## Deferred designs — not in the execution queue

### F1. NativeSelect option customization

Defer API design, not customization itself. Users choose how to customize options; the wrapper
must expose underlying renderer-supported capabilities rather than block them. Define web options,
Material fallback items and OS-owned menu actions separately; do not promise unsupported OS-menu
features. Trigger part keys and FabMenu item IDs are already done.

### F2. Token, theme and @property pruning

Separate design after asset-pruning measurements (17). Account for runtime token/theme references
and dynamic usage rather than extend static asset pruning speculatively.

### F3. Anatomy-part names for public customization across bindings

Standardize provider and instance customization on anatomy-part names in React, Solid and Native.
Today providers use preset style slots (`dialog.root` styles the surface), while instances use
anatomy parts (`dialog.content` is that surface; anatomy `root` is its structural wrapper).
Keep style-slot names for preset/theme authoring, not public element-prop customization.
Audit mappings, types and existing usages, with migration guidance and cross-binding regressions.
Do not silently accept both conventions: overlay `root` is ambiguous. Include structural parts
without style slots, handler/style precedence, accessibility and reactive/SSR behavior. This is a
future API refactor, not part of 9; Native provider support follows the existing web convention now.

## External verification and maintenance — independent of complexity order

- **V1. Slider focus-ring clipping:** obtain the nested-icon-button scene before changing clipping.
  Themed handle clearance and styled inset-icon reading already have passing regressions in
  `slider-inset-icon.e2e.test.ts`. Swipeable-row inset focus is intentional and was retired.
- **V2. Hover flicker:** capture browser/version, OS, pointing device and a recording of Menu Default
  and navigation items. Not reproduced headless, including a 1px sweep. Guard first-frame opening
  and keyboard highlighting; do not switch highlight ownership based on speculation.
- **V3. Native devices:** test NativeSelect `multiple`/`keepsMenuPresented`, SVG/native-driver ripple
  and morph paths, Reanimated path updates, toast swipe, `measureInWindow` submenu bounds and
  Android TouchTarget slop on iOS/Android, with both engines where applicable. Keep the optional
  native-menu peer unadvertised until verified. Delayed spring cancellation/factory spring tokens
  were already checked and do not need speculative changes.
- **V4. Assistive technology:** Snackbar announcements and click-only activation have DOM/API tests,
  not actual speech/click-delivery evidence. Verify persistent live regions, one iOS announcement
  per message and one virtual press/release per click with VoiceOver, TalkBack, NVDA or JAWS.
- **V5. Zag upgrades:** recheck Splitter's internal resizeObserver patches and long-press support.
  Current long press is 700 ms; consider 500 ms only if upstream exposes the option. Do not fork
  timing behavior without upstream support.

Record device/OS/engine/AT results and recordings; unavailable environments remain blocked.

## Retained decisions and out-of-scope tooling

- **9 completed (2026-10-30): Native provider slot props.** Provider `slotProps` use existing web
  component/style-slot keys and Native host props, reusing component host declarations and anatomy
  aliases for typing. Nested defaults merge styles and compose handlers outer first, then inner;
  instance customization retains precedence and Native internal handlers/state/accessibility/
  measurement wiring remain protected. The shared `useNativeSlotReader(name)` hook runs
  unconditionally in component owners and returns a cached pure reader usable inside callbacks;
  standalone `nativeSlots` remains context-free. Backdrops read `scrim.root`, not the owner's
  surface defaults. Calendar-cell defaults combine under picker cell customization. This pattern
  is documented in the Native README for new components. React/Solid contract regressions lock
  in nested merges, live replacement/removal without remounting, surface/scrim mapping and
  accessibility. Native additionally covers host typing, lazy per-copy functions, caching and
  TextInput handlers. Full React (1119) and Solid (1204) suites pass; Native passed 1034 tests with
  the recurring animated linear-progress sampling assertion failing (still deferred to 12).
  Native targeted provider/customization/date-picker tests and all three source type checks pass.
  Unifying provider/instance names is separate future work (F3), not a silent API change here.

- **8 completed (2026-10-29): per-item customization.** ChipSet, ButtonGroup, RadioGroup and Toolbar
  items take their own `class`/`className`, `style`, `slotProps`, `unstyled` and `tokens` over
  `chipProps`, `buttonProps`/`iconButtonProps` or `radioProps`, as List's `ListEntry` does, and test
  ids by part (`TestIdOverride`), in React, Solid and Native. SplitButton's and Toolbar's overflow
  `menuProps` take a function of each item (`MenuScopeInstances`). The React and Solid menu props
  type, duplicated in Select, Autocomplete and SearchView, is now one shared `MenuScopeProps` in each
  binding's `parts.tsx`; Native's menu already supported per-row functions, locked in with tests.
  Reusable pattern: an item drawn with per-part hooks (a radio's parts read through `useSlotProps`)
  renders its own child component, which merges its customization before reading its parts; other
  ready-mades hitting the same limit may copy it. Known gap, kept on purpose: overflow-menu entries do
  not take a per-item `testId` (the menu item type has none; group prefixing works through
  `menuProps.testId`); adding it is a separate change to the shared menu item type.

- **7 completed (2026-10-29): FAB-menu item count.** Composed `FabMenu.Root` takes an optional
  `itemCount`; without it, the list's registered count applies after mount. The preset's `staggering`
  token is 0 until a count is known, so composed SSR and first hydration render unstaggered rather
  than guessing eight steps. Ready-mades derive count from items; Native's ready-made menu already
  did. Later item additions update the count token without restarting the whole animation. Verified
  in preset (1338), React (1099) and Solid (1184) unit suites; web SSR/device checks remain V3 items.

- **6 completed (2026-10-29): Native wavy radial geometry.** User approved a shared SVG path
  approach, retaining the non-SVG border fallback rather than adding a native masking dependency.
  Failing rendered-path regressions reproduced the absence in both SVG engines. Native now draws
  the filled partial wave through the existing shared Drawing machinery, with token-driven size,
  amplitude, thickness and sweep; web keeps its existing mask geometry. Geometry tests verify
  crests/troughs, both band edges, RTL, half alignment, range/value updates, part colors/IDs/props,
  determinate/indeterminate and full/reduced motion, plus non-SVG fallback. Device path rendering
  remains V3 and is not claimed verified; linear wave motion/gaps remain separate (12).
- **5 completed (2026-10-29): Native cascading exit coordination.** Reproduced with real Animated
  and Reanimated presence drivers on Native Web: outside-click/Escape started only the parent exit,
  while selection started all levels. The overlay now passes logical visibility separately from
  the surface's own animation; each cascading portal starts its exit with the parent, recursively,
  without duplicating the parent's animation. Three-level regressions cover outside-click, Escape
  and selection on both engines; the full Native overlay suite passes. Actual device visuals remain
  in V3, not claimed verified. Web bindings and drill motion were not changed.
- **4 completed (2026-10-29): DockedDatePicker actions/trigger.** Optional `actions` content renders
  through the existing Actions part across React/Solid/Native; absent/null/false content adds no
  wrapper, no default buttons or new confirmation semantics. Web keeps its `trailingIcon` trigger
  slot; Native exposes its separate `trigger` Pressable through existing slot conventions, retaining
  trigger test IDs, measurement and accessibility. Tests cover reactive content, part customization,
  merged trigger handlers and both close-on-select settings. SSR/hydration passes on all web targets.
- **3 completed (2026-10-29): shared radius precedence.** Scope expanded by agreement to Button,
  IconButton and SplitButton alongside Chip/InputChip. Recipes set `defaultRadius`, leaving
  `radius` as the explicit override input: instance > theme > derived pill. Existing `pillRadius`
  customization and size/density-derived defaults remain supported. Native tests cover every size
  and density; styled React/Solid tests cover all web adapters, named/provider themes, instance
  overrides, reactive removal and uncustomized pills. Only affected recipe snapshots updated.
- **2 completed (2026-10-29): NativeSelect typing/ripple.** Cross-binding compile-time tests verify
  mode-dependent values, defaults and inferred callbacks, including rejected mismatches and web
  composed Root props. Shared discriminated typing was already correct; historical discrepancy
  retired. NativeSelect API documentation scopes indication/ripple customization to the Material
  fallback, not HTML/OS menus. Native-menu device verification remains V3.
- **1 completed (2026-10-29): BottomSheet callback verification.** Reopen regressions pass in
  React, Solid and Native Web: expanding, closing and reopening at partial rest reports only the
  user's expansion. Controlled-prop synchronization remains silent; existing drag and async-close
  coverage passes. Historical report retired without implementation changes. This verifies callback
  semantics in browser tests, not device motion. Remaining queue identifiers stay stable.
- Keep swipeable-row focus attached to the moving row, with its intentional inset ring.
- Keep FadeThrough timings theme-controlled (14).
- Keep `build` separate from `check:types` and retain `tsconfig.project.json` naming. Build,
  type-check and CI workflow work will be handled separately; no CI/release gating changes are
  authorized by this review.

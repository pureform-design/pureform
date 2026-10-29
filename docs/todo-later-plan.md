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

### 7. FAB-menu composed item count and SSR

- Composed Root discovers items after mount; SSR currently guesses eight animation steps.
- Ready-mades derive count from item data. Composed menus support an optional explicit count.
- Without an explicit count, server output and the first hydration frame use a stable non-staggered
  state; enable automatic staggering after registration instead of guessing eight items.
- Do not inspect arbitrary children. Later additions/removals must not restart the whole animation.
- Test initially open/closed menus, explicit/automatic counts, hydration and variable item counts.

## C. Shared APIs and motion — moderate to high complexity

### 8. Per-item customization consistency

- Audit ButtonGroup, ChipSet, Toolbar and RadioGroup item classes, tokens, style functions and
  test IDs against List's established `InnerPropsOf` and instance-function conventions.
- Audit SplitButton/Toolbar per-item `menuProps` functions under those same conventions.
- Reuse established APIs, not a new customization system; verify current gaps before expanding.
- Compile usage tests first. Preserve provider/instance/slot precedence, internal handler merging
  and equivalent cross-binding capabilities with host-specific props.
- Test post-mount updates, especially Solid, and avoid SSR/hydration or reactive-node-budget regressions.

### 9. Provider-level Native slotProps

- Follow established web provider APIs and merge behavior closely, adapting host typing to Native.
- Audit web conventions first; do not invent a separate Native API.
- Test provider/instance/slot precedence, style and handler merging, and preservation of internal
  behavior/accessibility wiring. Instance customization must retain its established precedence.

### 10. FAB-menu Compose-style motion

- Current source report: items scale from their centers. The agreed reference is current Compose
  Material 3, not spatial movement from the FAB or a simple transform-origin change.
- Stagger starting nearest the FAB; animate item width and opacity at fixed height from the menu's
  aligned edge (end by default, mirrored in RTL). Reverse visibility sequence on closing.
- Compose uses SlowEffects/FastSpatial/FastEffects for stagger/width/opacity. Retain theme-controlled
  motion and reduced-motion support rather than hardcode an unrelated animation policy.
- Reproduce current motion, test direction/alignment and rapid toggles, and integrate with count
  and hydration behavior from 7.

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

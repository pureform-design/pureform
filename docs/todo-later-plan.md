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

## A. Verification and documentation — easiest

### 1. BottomSheet expansion callback verification

- Historical report: reopening an uncontrolled sheet at another rest fires `onExpandedChange`.
- Agreed contract: report user-driven expansion changes (drags/handle presses), not initialization,
  reopening, controlled-prop synchronization or closing. Open and expanded are separate states.
- Current React/Solid/Native source already suppresses non-user changes. Add an explicit reopen
  regression before retiring the report; no speculative behavior change.
- Guard user-driven reporting and controlled behavior. Native sheets already travel by measured
  size and hold for async `onClose`; do not regress those behaviors.

### 2. NativeSelect typing verification and fallback ripple documentation

- The historical cross-binding value-type discrepancy appears stale: all bindings use shared
  `NativeSelectValueProps`, discriminated by `multiple`.
- Verify single string/multiple readonly string-array values, defaults and matching callbacks with
  cross-binding usage/type tests, including rejected mismatches, then retire the stale report.
- Retain Material Menu fallback ripple customization; document its renderer-specific scope.
  Do not imply it customizes OS-owned menus. Native-menu claims remain gated on V3 device tests.

## B. Bounded component work — low to moderate complexity

### 3. Chip/InputChip radius precedence

- Chip writes the derived pill radius at the root, blocking explicit theme radius overrides.
- Agreed precedence: instance radius > explicit theme radius > size/density-derived pill default.
- Density changes dimensions, not an explicit radius. Uncustomized chips remain pill-shaped as
  height changes. Apply equally to Chip and InputChip.
- Regress provider/named themes, instance overrides and density variants.

### 4. DockedDatePicker ready-made actions and trigger customization

- React/Solid define the Actions part but do not render it in ready-mades; composed Actions works.
- Accept optional user-supplied action content and render Actions only when supplied.
- Do not add default OK/Cancel buttons or change selection/close-on-select semantics.
- Use existing `slotProps.trigger` conventions, preserving internal handlers and accessibility.
- Test content, absent/empty actions, slot merges and unchanged selection behavior. Preserve the
  Native trigger ID's existing `testId` behavior.

### 5. Native cascading submenu outside-click exit

**User-reported; reproduction required.** Separate from drill motion (13).

- Open a cascading submenu, then click elsewhere without selecting an item: the submenu reportedly
  waits for the parent to animate away, then disappears instantly without its own exit animation.
- Submenu-item selection animates correctly; web targets work correctly.
- Regress the outside-click path before fixing exit/presence coordination. Animate submenu exit
  during dismissal, preserving the working selection path and web behavior.
- Validate both supported Native animation engines; record device evidence where needed.

### 6. Native wavy radial progress shape

**User-reported; reproduction required.** No visible waviness, not merely incorrect wave motion.

- Inspect rendered path geometry and add a failing regression before restoring the wavy shape.
- Cover determinate/indeterminate modes and reduced motion with both Native animation engines.
- Validate actual device paths separately from Native Web; animation prop presence is insufficient.
- Keep this distinct from linear track geometry and gaps (12).

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

- Keep swipeable-row focus attached to the moving row, with its intentional inset ring.
- Keep FadeThrough timings theme-controlled (14).
- Keep `build` separate from `check:types` and retain `tsconfig.project.json` naming. Build,
  type-check and CI workflow work will be handled separately; no CI/release gating changes are
  authorized by this review.

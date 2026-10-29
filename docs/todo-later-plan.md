# Parked work: relevance review and action plan

Reviewed 2026-10-29 after the platform-boundary refactor and follow-up regressions. This is a source/test
audit, not a claim that every historical visual report has been reproduced. Keep device-only
and subjective behavior out of speculative quick fixes.

## Execution order: smallest fixes to architectural changes

Effort estimates are relative, not promises: an unreproduced report can move groups after
investigation. Work through one numbered item at a time. For each item, confirm relevance,
recommend a concrete approach, add a regression, implement, validate and remove the resolved
backlog entry. Pause for agreement on public API or behavioral decisions. Device-dependent
verification is a separate lane and must not block unrelated fixes.

### B. Bounded component fixes — moderate implementation/testing

| Order | Item                                       | Recommended approach                                                                                                                                                       |
| ----- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1    | Swipeable row / Slider focus-ring clipping | Row ring is deliberately inset, not lost; decide whether to move it outside the clipping frame. Slider clipping not reproduced: obtain the nested-icon-button scene first. |
| B3    | NativeSelect option parts                  | Define web/fallback options separately from OS-owned menu actions before adding slots. Other B3 reports are resolved or retired.                                           |

### C. Cross-cutting fixes — broad regression surface

| Order | Item                                                           | Recommended approach                                                                                                              |
| ----- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| C2    | Arbitrarily nested reduced motion / provider-aware motion-safe | Establish nearest-provider semantics across all adapters; test system/full/reduce combinations and SSR before choosing selectors. |
| C6    | Interrupted page transitions                                   | Preserve in-flight visual progress and leaving-page identity; test rapid direction changes before altering the page lifecycle.    |
| C7    | Native drill width / label translation / sibling fades         | Implement from measured geometry and existing springs after visual reproduction; validate both engines.                           |
| C8    | Linear wavy progress motion and gaps                           | Specify track-relative geometry and gap windows, then implement consistent web/Native rendering.                                  |

### D. Explicit product/API decisions — agree on the contract first

| Order | Item                                                                            | Recommendation / decision needed                                                                                                                 |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1    | Chip/InputChip radius precedence                                                | Recommend explicit theme radius overrides win over derived defaults; confirm how density affects an explicit radius.                             |
| D3    | DockedDatePicker ready-made actions and trigger props                           | Decide whether action content belongs in the ready-made and how trigger customization is exposed; do not merely render an empty Actions wrapper. |
| D4    | BottomSheet onExpandedChange on reopen                                          | Decide whether it reports every effective rest change or only user-driven changes.                                                               |
| D5    | Live submenu adaptation                                                         | Decide whether an open menu changes cascade/drill mode on resize/scroll/content changes; add observers only for that contract.                   |
| D6    | FAB-menu transform origin / composed SSR item count                             | Specify the intended growth pivot and choose an explicit count or server-safe composition contract.                                              |
| D7    | Per-item styling on ButtonGroup/ChipSet/Toolbar/RadioGroup; menu prop functions | Recommend existing InnerPropsOf and instance-function conventions, with one consistent cross-binding type contract.                              |
| D8    | NativeSelect value typing and fallback ripple API                               | Align with the chosen cross-binding discriminated/union convention; keep optional native-menu claims gated on device tests.                      |
| D9    | Node checks in build / tsconfig naming                                          | Recommend retaining explicit check:types gating unless build guarantees require otherwise; avoid a naming-only migration without a benefit.      |
| D11   | Compose timing parity                                                           | Decide whether exact Compose timings or theme roles are the contract; recommend retaining theme roles by default.                                |

### E. Large API/architecture projects — separate designs and milestones

| Order | Item                                                   | Recommended approach                                                                                                            |
| ----- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| E1    | Select multiple-value mode                             | Design scalar/array discrimination, selection UX, accessibility and form serialization together across bindings.                |
| E2    | Provider-level Native slotProps                        | Decide whether the API is needed; if yes, design provider/instance/slot merge precedence and typed hosts before implementation. |
| E3    | Pruning keyframes/shapes, then tokens/themes/@property | Start with measured output and conservative reachability; separate asset pruning from runtime theme/token pruning.              |

### Verification lane — needs external evidence, not speculative fixes

- **Hover flicker:** obtain a recording, browser/OS and pointing-device details before changing highlight ownership.
- **iOS/Android:** NativeSelect multiple/keepsMenuPresented, native SVG/ripple/morph paths, toast swipe,
  measureInWindow submenu bounds and Android touch slop. Check both supported engines where applicable.
- **Screen readers:** confirm Snackbar and virtual-click results on actual AT, not DOM attributes alone.
- **Dependency maintenance:** recheck Splitter's internal patches and long-press options when Zag changes;
  do not fork timing behavior without upstream support.

## Detailed acceptance criteria by area

Each work item starts with a failing regression or a recorded reproduction. If it no longer
reproduces, retire it with the test/source evidence instead of changing behavior.

### 1. Accessibility and input correctness

**Source-supported gap:** Select's shared API has no multiple-value mode. Snackbar announcements,
click-only activation and typed Snackbar button sources are now implemented and covered by DOM
and API tests; actual screen-reader behavior is unverified (see the verification lane).

1. Treat Select multiple mode as an API project: define scalar/array discrimination, deselection,
   labels, form serialization and keyboard/AT behavior across all bindings before implementation.

**Exit gate:** targeted interaction tests plus React/Solid/Native suites; a recorded AT matrix
for the Snackbar and click-only work already implemented.

### 2. Motion and layout regressions

**Confirmed source limitations:** reduced-motion selectors in `css-lowering/src/motion.ts` only
handle limited provider nesting; Chip writes its radius as a root token; web docked pickers define
Actions but do not render that part in ready-mades.

1. Reproduce `reduce → full → reduce` and reverse/system combinations. Choose a nearest-provider
   strategy before editing selectors; test CSS, Panda, Tailwind, SSR and hydration together.
   Include provider-aware `_motionSafe` / `motion-safe`, not just reduce variants.
2. Check Chip round-radius overrides in provider/named themes and density variants. Define whether
   explicit radius or density-derived pill radius wins, then use the same policy for InputChip.
3. Reproduce SwipeableListRow/Slider focus-ring clipping in a styled browser fixture. Slider's
   themed handle clearance and styled inset-icon reader already have passing regressions.
4. Recheck interrupted page transitions. Native FadeThrough now settles its page model without
   restarting presence. Compare default and custom motion themes rather than hardcoding Compose timings.
5. Check FAB-menu transform origin and composed SSR item count; choose an explicit count contract
   or server-safe composition strategy, with hydration and variable-item-count tests.
6. Reproduce linear-wavy track motion/gaps across determinate and indeterminate modes. Implement
   Native gap windows only after geometry tests specify both visible track segments.
7. Verify Reanimated path updates on devices, not merely prop presence on Native Web. Delayed
   spring cancellation and factory spring tokens were checked and need no change.
8. For DockedDatePicker, decide whether the ready-made should expose action content at all
   (composed Actions already works). Its Native trigger ID now follows `testId`.

**Exit gate:** styled geometry/motion regressions, reduced-motion checks, SSR/hydration checks,
and affected adapter snapshots; no blanket snapshot regeneration.

### 3. Menus, sheets and hardware checks

1. Capture the hover flicker with browser/version, OS, device type and a screen recording.
   Reproduce Menu Default and navigation items with a real pointer before changing all bindings
   from machine highlighting to CSS hover. Guard first-frame-open and keyboard highlighting.
2. Test auto-submenu live resize, scrolling/clipping, delayed content and a wider child. Only add
   observers if the current open-time decision fails the chosen behavior contract.
3. Recheck Native drill width, label-only translation and sibling fades; cascade arrow navigation
   passes on Native Web (LTR and RTL) but not on devices. Record the current behavior on both
   device platforms before motion changes.
4. Define when BottomSheet `onExpandedChange` should fire on reopen before altering callbacks.
   Native sheets already travel by their measured size and hold for an async `onClose`.
5. Run iOS/Android checks for NativeSelect (`multiple`, `keepsMenuPresented`), SVG/native-driver
   ripple and morph paths, toast swipe, `measureInWindow` submenu bounds and Android touch slop.
   Keep the optional native-menu peer unadvertised until these pass.

**Exit gate:** device/OS/engine matrix with recordings; list unavailable devices as blocked,
not passed. Hover and device reports cannot be closed from this headless environment alone.

### 4. Slot/API consistency and missing coverage

These older reports remain **verification candidates**, unless identified as source-supported
above. No API expansion should be made solely because the old note requests it.

1. Audit per-item `className`/`class`, `tokens`, style functions and test IDs on ButtonGroup,
   ChipSet, Toolbar and RadioGroup against List's `InnerPropsOf` pattern. Compile usage tests first.
2. Audit SplitButton/Toolbar per-item menu functions. Test post-mount updates to avoid
   reintroducing eager Solid reads.
3. Audit NativeSelect option parts (trigger part keys and FabMenu item IDs are done).
   Decide provider-level Native `slotProps` separately; test instance/provider merge precedence
   before adding any provider API.
4. Recheck NativeSelect value-type differences and fallback `ripple` usage against device findings.
5. Review Splitter's Zag resizeObserver patches and long-press options on upgrades.

**Exit gate:** cross-binding usage/type tests, reactive updates, merge precedence, stable IDs,
and no new SSR/hydration or reactive-node-budget regressions.

### 5. Tooling and output-size work

1. Decide node-check-in-build and tsconfig naming policies as tooling changes, not bug fixes.
2. Measure full/pruned CSS bytes and asset counts, then implement reachability for keyframes and
   shape paths (including runtime theme/variant references). Keep dynamic/unknown references
   conservatively. Token/theme/@property pruning is a later, separate pass.

**Exit gate:** explicit tooling policy decisions and before/after bundle measurements with
dynamic-reference safety tests.

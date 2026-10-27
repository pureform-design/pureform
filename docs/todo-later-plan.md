# Parked work: relevance review and action plan

Reviewed 2026-10-27 against `main` after the platform-boundary refactor. This is a source/test
audit, not a claim that every historical visual report has been reproduced. Keep device-only
and subjective behavior out of speculative quick fixes.

## Next actions, in priority order

Each work item starts with a failing regression or a recorded reproduction. If it no longer
reproduces, retire it with the test/source evidence instead of changing behavior.

### 1. Accessibility and input correctness

**Source-supported gaps:** ready-made web Snackbar still forwards generic slot props rather
than exposing typed button interaction sources; calendar month/year cells initialize `today`
and `outside` false; Select's shared API has no multiple-value mode. These are separate changes,
not one accessibility rewrite.

1. Reproduce zero-value Rating announcements in React/Solid and check Native parity. Assert no
   checked star at zero, while preserving half-star pointer geometry, form value and keyboard entry.
2. Verify Snackbar announcements with an initially mounted closed region and repeated identical
   messages. If missed, keep the live region mounted and insert/update message content on show;
   prevent duplicate announcements and preserve exit/pause behavior.
3. Reproduce virtual clicks through the interaction machines (`machines/src/interaction/emitter.ts`).
   Add click-only AT coverage, with no duplicate press after pointer or keyboard activation.
4. Design typed per-button interaction-source forwarding for ready-made Snackbar across bindings;
   test source isolation, source replacement and composed-part parity.
5. Add calendar current-month/current-year and range-boundary tests before changing cell flags.
6. Treat Select multiple mode as an API project: define scalar/array discrimination, deselection,
   labels, form serialization and keyboard/AT behavior across all bindings before implementation.

**Exit gate:** targeted interaction tests plus React/Solid/Native suites and a recorded AT matrix.

### 2. Motion and layout regressions

**Confirmed source limitations:** reduced-motion selectors in `css-lowering/src/motion.ts` only
handle limited provider nesting; direction selectors in `conditions.ts` can match an RTL ancestor
inside a nearer LTR subtree; Chip writes its radius as a root token; web docked pickers define
Actions but do not render that part in ready-mades; Native docked picker trigger ID is hardcoded.

1. Reproduce `reduce → full → reduce` and reverse/system combinations. Choose a nearest-provider
   strategy before editing selectors; test CSS, Panda, Tailwind, SSR and hydration together.
   Include provider-aware `_motionSafe` / `motion-safe`, not just reduce variants.
2. Add nested RTL/LTR and element-local direction regressions; evaluate `:dir()` across the CSS,
   Panda and Tailwind adapters, then update snapshots and mirrored keyboard/geometry tests.
3. Check Chip round-radius overrides in provider/named themes and density variants. Define whether
   explicit radius or density-derived pill radius wins, then use the same policy for InputChip.
4. Reproduce SwipeableListRow/Slider focus-ring clipping and Slider keyboard value-indicator
   visibility in a styled browser fixture. Resolve themed handle clearance and add reader coverage.
5. Recheck interrupted page transitions, settled Native FadeThrough state and named-theme scrim
   opacity. Compare default and custom motion themes rather than hardcoding Compose timings.
6. Check FAB-menu transform origin and composed SSR item count; choose an explicit count contract
   or server-safe composition strategy, with hydration and variable-item-count tests.
7. Reproduce linear-wavy track motion/gaps across determinate and indeterminate modes. Implement
   Native gap windows only after geometry tests specify both visible track segments.
8. Test delayed tab springs and factory spring-token support separately; preserve cancellation
   on unmount/replacement. Verify SVG finite odd alternate iteration counts and Reanimated path
   updates on devices, not merely prop presence on Native Web.
9. For DockedDatePicker, first decide whether the ready-made should expose action content at all
   (composed Actions already works); then define trigger slot/test-ID semantics without silently
   duplicating the trailing-icon ID.

**Exit gate:** styled geometry/motion regressions, reduced-motion checks, SSR/hydration checks,
and affected adapter snapshots; no blanket snapshot regeneration.

### 3. Menus, sheets and hardware checks

1. Capture the hover flicker with browser/version, OS, device type and a screen recording.
   Reproduce Menu Default and navigation items with a real pointer before changing all bindings
   from machine highlighting to CSS hover. Guard first-frame-open and keyboard highlighting.
2. Test auto-submenu live resize, scrolling/clipping, delayed content and a wider child. Only add
   observers if the current open-time decision fails the chosen behavior contract.
3. Recheck Native drill width, label-only translation, sibling fades and cascade arrow navigation.
   Record the current behavior on Native Web and both device platforms before motion changes.
4. Reproduce Native sheet travel distance against measured sheet bounds, and async close refusal.
   Define when BottomSheet `onExpandedChange` should fire on reopen before altering callbacks.
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
2. Reproduce Solid Toolbar's hidden-menu string `style.root` handling and audit SplitButton/Toolbar
   per-item menu functions. Test post-mount updates to avoid reintroducing eager Solid reads.
3. Audit Native trigger/context-trigger part keys, FabMenu item IDs and NativeSelect option parts.
   Decide provider-level Native `slotProps` separately; test instance/provider merge precedence
   before adding any provider API.
4. Audit Ripple's class/style/slot forwarding. Keep the two existing `it.fails` cases in
   `tests/component-suites/src/indication.e2e.test.ts` as explicit known failures until component
   indication opacity and provider/named-theme token resets are fixed and pass normally.
5. Add or locate FileUpload submission with actual File entries, half-star width geometry and
   controlled Solid Textarea SSR tests; the local Textarea spec currently only tests client mount.
6. Recheck NativeSelect value-type differences and fallback `ripple` usage against device findings.
7. Review Splitter's Zag resizeObserver patches and long-press options on upgrades.

**Exit gate:** cross-binding usage/type tests, reactive updates, merge precedence, stable IDs,
and no new SSR/hydration or reactive-node-budget regressions.

### 5. Tooling and output-size work

1. Reproduce two generators with different plans targeting one output directory. Assert every
   exported path exists after both finish. Use serialization/transactional output if reproduced;
   per-file atomic writes alone do not serialize pruning. Never clear unowned app files.
2. Decide node-check-in-build and tsconfig naming policies as tooling changes, not bug fixes.
3. Document default-target versus explicit `.pureform/native` imports with a mixed-target type
   fixture; redesign the entry only if the current contract is confusing in real usage.
4. Measure full/pruned CSS bytes and asset counts, then implement reachability for keyframes and
   shape paths (including runtime theme/variant references). Keep dynamic/unknown references
   conservatively. Token/theme/@property pruning is a later, separate pass.

**Exit gate:** deterministic concurrent-generation tests, mixed-target typechecks, and before/after
bundle measurements with dynamic-reference safety tests.

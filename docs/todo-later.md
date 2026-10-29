# Follow-up backlog

Reviewed and decisions agreed 2026-10-29. Ordered from easiest to hardest, with the same identifiers
as [the implementation plan](todo-later-plan.md), which contains the full contracts and acceptance
criteria. These are not all confirmed bugs: reproduction and external verification remain explicit.

## B. Bounded component work — low to moderate complexity

7. **FAB-menu SSR item count:** replace the guessed eight steps with data-derived ready-made counts,
   optional explicit composed counts and stable non-staggered SSR/first-hydration fallback until
   registration. Dynamic item changes must not restart the whole animation.

## C. Shared APIs and motion — moderate to high complexity

8. **Per-item customization:** audit ButtonGroup/ChipSet/Toolbar/RadioGroup and SplitButton/Toolbar
   menu functions. Reuse established List/InnerPropsOf and instance-function conventions, including
   merge precedence, internal handlers, host typing and Solid post-mount reactivity.
9. **Native provider slotProps:** closely follow web provider APIs and merge behavior, with Native
   host typing and tests for provider/instance precedence, handlers, styles and accessibility.
10. **FAB-menu motion:** Compose-style nearest-first stagger, aligned-edge width expansion at fixed
    height and opacity; reverse visibility sequence on close. Not center scaling or spatial travel
    from the FAB. Retain theme roles, RTL and reduced motion.
11. **Nested motion providers:** nearest provider wins at any depth; system follows OS, full
    overrides OS reduction, reduce requests reduction. Motion-safe uses the same effective setting
    across adapters, including SSR/hydration.
12. **Linear wavy progress:** reproduce wave movement/gaps, then match Compose track-relative motion
    at one wavelength per second by default and gaps around the active indicator. Preserve theme
    overrides; test both modes, RTL, reduced motion and Native visible track segments.
13. **Native drill animation:** reproduce on devices; animate measured width/height, translate
    labels and fade nonparticipating rows. Reverse back navigation, mirror RTL and use theme
    springs/reduced motion with both engines.

## D. Lifecycle and architecture — hardest

14. **Interrupted page transitions:** reproduce and preserve in-flight visual progress/outgoing
    identity. Reuse returning pages where practical; latest navigation wins without queuing.
    Keep theme-controlled timing, not exact Compose constants.
15. **Live auto-submenu adaptation:** adapt cascade/drill both ways on layout changes across all
    platforms, preserving active submenu/focus with a small stability margin against oscillation.
    Explicit modes remain explicit; verify Native measurement on devices.
16. **Select multiple mode:** mode of Select with strict scalar/array values/defaults/callbacks
    discriminated by `multiple`. Toggle without closing, selection checkmarks, keyboard toggling,
    repeated form fields and customizable summary; design cross-binding accessibility together.
17. **Asset pruning:** measure output, then conservatively prune unused keyframes/shape paths.
    Keep runtime theme/variant and unknown references; test theme changes. Token/theme/@property
    pruning is separate.

## Deferred designs

- **F1. NativeSelect option customization:** API design deferred, not customization. The wrapper
  must expose renderer-supported customization, with distinct web/fallback/OS-owned contracts.
- **F2. Token/theme/@property pruning:** separate design after keyframe/shape output measurements.

## External verification and maintenance

- **V1. Slider clipping:** obtain the nested-icon-button reproduction; existing handle-clearance
  and styled inset-icon tests pass.
- **V2. Hover flicker:** needs recording, browser/OS and pointing-device details. Preserve keyboard
  highlighting and first-frame behavior; not reproduced headless.
- **V3. Native devices:** NativeSelect menus, SVG/ripple/morph/Reanimated paths, toast swipe,
  submenu measurement and Android touch slop; test iOS/Android and both engines where relevant.
- **V4. Screen readers:** verify Snackbar speech and virtual-click delivery on real AT, not DOM/API
  spies alone.
- **V5. Zag upgrades:** recheck Splitter internal patches and upstream long-press options; no
  speculative fork of timing behavior.

## Retained decisions / separate work

- **6 completed:** shared filled SVG wave arc restores Native radial waviness on both SVG engines;
  non-SVG fallback retained. Actual rendered geometry, modes, RTL, theme dimensions, value updates
  and reduced motion tested. Device rendering remains V3; linear waves/gaps remain item 12.
- **5 completed:** reproduced and fixed Native cascading dismissal coordination. Outside-click,
  Escape and selection now start every open level's exit together; three-level tests pass on both
  engines in Native Web. Device visuals remain V3; web bindings/drill motion unchanged.
- **4 completed:** optional DockedDatePicker actions across bindings, with reactive part props and
  unchanged selection semantics. Native trigger forwards established slot props/styles and merges
  handlers; existing IDs/accessibility preserved. Web SSR/hydration verified across adapters.
- **3 completed:** shared radius fallback for Chip/InputChip, Button, IconButton and SplitButton.
  Explicit radius wins over derived size/density defaults; existing pillRadius customization stays.
  Native and all six web binding/adapter combinations verified.
- **2 completed:** NativeSelect mode-dependent values/defaults/callbacks verified across bindings;
  stale discrepancy retired. Fallback indication/ripple scope documented; device checks remain V3.
- **1 completed:** BottomSheet reopen regressions pass in React, Solid and Native Web; only user
  expansion reports a change. Historical report retired without implementation changes. Queue IDs
  stay stable; device motion is not claimed verified.
- Swipeable-row inset focus attached to the moving row is intentional; report retired.
- FadeThrough remains theme-controlled; exact Compose timings are not required.
- Retain separate `build`/`check:types` and `tsconfig.project.json`. Build/type-check/CI work is
  handled separately, with no CI/release gating changes authorized here.

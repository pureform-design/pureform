# B1–B9 reproduction findings

Investigated 2026-10-28 against `bacfcae3`, on branch `investigate/backlog-b1-b9`.
Production behavior was not changed. The added tests characterize current behavior and API
limitations; they are not assertions that the current behavior is the desired final contract.
No backlog entries have been retired by this investigation.

Scope correction: the B8 Native mounting observation below describes the standalone surface.
The Native Snackbar queue already explicitly announces string messages on iOS through
`AccessibilityInfo.announceForAccessibility`. The fix batch will test that path separately;
neither a DOM live-region assertion nor an API spy establishes actual spoken output.

## Outcome of the follow-up fixes

The table below records what was found _before_ fixing. Afterwards, on this branch:

- **B2:** Snackbar `slotProps.action`/`close` accept an `interactionSource` on React, Solid and
  Native (isolated sources, replaceable); tested.
- **B3:** FabMenu items take an optional `testId` (prefix or partial map; defaults unchanged)
  on all three bindings, and the Native DockedDatePicker trigger follows `testId` (`<prefix>-trigger`
  or `testId.trigger`). NativeSelect option parts stay deferred.
- **B7:** Native FadeThrough settles its page model after its own enter completes, without
  switching the presence driver, so nothing restarts; tested on both engines.
- **B8:** React, Solid and Native keep a persistent live region (`<output>` on web) that receives
  the message when it opens; the animated surface is `role="group"`. On iOS the surface makes the
  single `announceForAccessibility` call, shared by queued and standalone snackbars. Verified by
  DOM mutations and API spies only, **not** by actual speech.
- **B9:** click-only activation (`detail === 0`, no pointer or key press in progress) emits one
  virtual press/release, claimed at the innermost surface; pointer and keyboard clicks are
  deduplicated. Covered for buttons, checkables, radios, pressable items and highlighted menu
  items, and for Native Web's `Pressable`. Real assistive-technology delivery is unverified.
- **B1, B4–B6:** unchanged (not reproduced, or intentional behavior); see the decisions below.

## Results

| Item | Result                                                               | Evidence and recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1   | Partly confirmed; no lost ring reproduced                            | A swipeable ListItem has a 3px ring with a -3px offset inside its clipping frame on React/Solid × CSS/Panda/Tailwind. The inset is intentional in the preset, not an accidentally missing outline. The stock Slider has a visible outline and no clipping ancestor in the tested fixture. Keep the row's outside-ring redesign as a deliberate layout change; obtain the specific nested-icon-button Slider scene before fixing that report.                                                                                                                                                              |
| B2   | Confirmed API/type gap, not a complete web runtime failure           | React/Solid ready-made Snackbar forwards separate action/close sources through `slotProps` at runtime, with isolated press/release events. Both bindings' public slot types reject `interactionSource`, while composed Action accepts it. Native has neither a dedicated action-source prop nor a typed host-slot route; its SurfaceButton creates its own indication without accepting an external source. Agree on typed per-button forwarding before implementation.                                                                                                                                   |
| B3   | Mixed: several stale reports, several real API limitations           | Native Menu trigger/contextTrigger and Dialog/Popover triggers already honor part styles and test-ID overrides; existing regressions pass. DatePicker trigger customization also passes. FabMenu uses repeated shared item IDs and has no typed individual item-ID override. NativeSelect exposes root/select/icon hosts, not option hosts; its web options have no test IDs. DockedDatePicker ignores the component ID prefix for its hardcoded trigger ID. Preserve repeated-ID defaults unless a new contract is approved; distinguish NativeSelect's web/fallback options from OS-owned menu actions. |
| B4   | Not reproduced on Native Web                                         | Existing LTR cascade opening, child traversal, return, and leaf selection tests pass on Animated/Reanimated. Added RTL tests also pass, including skipping a disabled child and returning focus to the parent item. Do not implement another keyboard loop. Device/hardware-keyboard behavior remains unverified.                                                                                                                                                                                                                                                                                         |
| B5   | Original reports not reproduced on Native Web                        | Existing tests verify bottom-sheet travel by its measured height and holding a drag while a Promise-returning `onClose` is pending, then refusal/acceptance. Added tests verify a 180px side sheet starts its travel at 180px, not viewport width, on both engines. The pending-confirmation API already exists: `onClose` can return a Promise. A controlled owner that simply ignores or defers `onOpenChange` is a different contract; the component cannot infer pending vs refusal from an unchanged prop. No new pending API is justified by the original reproduction.                             |
| B6   | Original limitations not reproduced                                  | Native slides pass delay to Animated.spring; a new test confirms stopping a delayed spring on replacement/removal. Native factories accept structured spring instance tokens and named spring roles. Web token serialization supports both; web indicator slides use WAAPI's delay, not setTimeout. Existing focused tests pass. No new spring-token API is justified. This does not claim exhaustive interruption/unmount coverage for every motion path.                                                                                                                                                |
| B7   | Internal lifecycle mismatch confirmed; visual failure not reproduced | Native FadeThrough keeps its page in `entering` and keeps the presence driver's phase at `enter` after completion. Instrumented tests on both engines confirm completion, final opacity 1, one surviving page, and no replay during the observation interval. Native does not simply expose web's data-state contract here. Treat settling as a targeted lifecycle cleanup, not a proven stuck-animation bug. Preserve theme timings; do not change Compose timing policy as part of this item.                                                                                                           |
| B8   | Live-region risk confirmed; missed speech unverified                 | React/Solid mount the closed status region with its message already present. Reopening an identical message changes visibility without mutating the message subtree. Native instead renders no region while closed and mounts an already-populated polite status region on open. Both differ from a stable region receiving new text, but DOM tests cannot prove missed or duplicate speech. Require real AT evidence before claiming an announcement fix.                                                                                                                                                |
| B9   | Click-only interaction gap reproduced                                | On React/Solid × all three web styling targets, native `.click()` activates Button's onClick but emits no interaction-source press/release. Native Web similarly invokes onPress without source press/release. The event-path gap is confirmed; this is not a substitute for real AT validation. Any fix needs pointer/keyboard deduplication and nested-surface coverage, not an unconditional extra press on every click.                                                                                                                                                                               |

## Reproduction sources

- `tests/component-suites/src/backlog-b-investigation.e2e.test.ts`: B1 outline/ancestor geometry,
  B2 runtime source isolation, B8 identical-message mutations, B9 click-only activation.
- `packages/react/src/snackbar/backlog-b2.spec.tsx` and
  `packages/solid/src/snackbar/backlog-b2.spec.tsx`: compile-time ready-made/composed API comparison.
- `packages/react-native/src/backlog-b-investigation.spec.tsx`: Native B2/B3 API checks,
  RTL cascade traversal, measured side-sheet travel, completed FadeThrough phase, Snackbar region
  mounting, and click-only activation. Platform-native menus and device layout are not simulated
  into a claim of device correctness.
- `packages/react-native/src/slide.spec.tsx`: added delayed-spring replacement/removal check.

Existing coverage rerun:

- Native Menu parts, overlays, presence, slides, NativeSelect, FabMenu, FadeThrough, and date
  pickers: 232 reported tests passed (includes Vitest's typecheck project entries).
- Native factory tests: 42 reported tests passed, including structured/named spring overrides.
- Web token tests: 16 reported tests passed; web slide tests: 12 reported tests passed.
- Added cross-target browser characterizations: 36 tests passed.
- Added Native characterizations plus slide checks: 25 reported tests passed.
- React/Solid B2 type probes: both passed, with no type errors.

Diagnostics: baseline workspace lint/typechecks passed 70 tasks; two disabled checks skipped.
Captured results/logs are in `/tmp/opencode/b1-b9-baseline.json` and
`/tmp/opencode/b-*-investigation.log`, `b-*-b2.log`, `b-native-factory.log`,
`b-web-tokens.log`, and `b-web-slide.log`.

## Decisions and external evidence still needed

1. **B1:** whether to move the swipeable row ring outside, preserving swipe clipping; the exact
   older Slider icon-button scene is still needed to reproduce that report.
2. **B2:** typed per-button source prop shape, consistent across bindings. Web already has a
   runtime forwarding route, so an API expansion is not the only possible solution.
3. **B3:** per-item ID customization, NativeSelect option scope, and DockedDatePicker trigger
   naming/compatibility. Provider-level Native slotProps remains separate.
4. **B7:** whether to prioritize internal settled-state parity despite passing visual completion.
5. **B8/B9:** actual screen-reader/browser/OS evidence. Proposed announcement/repeated-message
   and click-only contracts must not be presented as validated AT behavior.

B4–B6 should not receive speculative production fixes on the evidence collected here. Device
checks and unrelated broader motion/API work remain separate.
